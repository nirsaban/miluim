import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { AdminService } from './admin.service';
import { MessagesService } from '../messages/messages.service';
import { ShiftsService } from '../shifts/shifts.service';
import { FormsService } from '../forms/forms.service';
import { NotificationsService } from '../notifications/notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, MessageType, MessagePriority, MessageTargetAudience, ShiftType, FormStatus, SoldierStatusType } from '@prisma/client';

/**
 * Admin Controller
 *
 * Role-based access:
 * - ADMIN: Full access to all endpoints
 * - LOGISTICS: Shifts only (via separate endpoints, not messages/forms/soldiers)
 * - OFFICER: Forms and department-scoped access only
 *
 * Note: DUTY_OFFICER (MilitaryRole) with OFFICER role has department-scoped access
 * but should NOT access this controller's messages endpoints.
 */
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly messagesService: MessagesService,
    private readonly shiftsService: ShiftsService,
    private readonly formsService: FormsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get('dashboard')
  @Roles(UserRole.ADMIN, UserRole.OFFICER, UserRole.LOGISTICS)
  getDashboardStats(@CurrentUser() user: any) {
    return this.adminService.getDashboardStats(user);
  }

  // Messages - ADMIN only (not LOGISTICS or DUTY_OFFICER)
  @Get('messages')
  @Roles(UserRole.ADMIN)
  getAllMessages(@CurrentUser() user: any) {
    return this.messagesService.findAll(undefined, user);
  }

  @Post('messages')
  @Roles(UserRole.ADMIN)
  createMessage(
    @CurrentUser() user: any, @Body() body: {
      title: string;
      content: string;
      type?: MessageType;
      priority?: MessagePriority;
      targetAudience?: MessageTargetAudience;
      requiresConfirmation?: boolean;
    },
  ) {
    return this.messagesService.create(body, user.id, user);
  }

  @Patch('messages/:id')
  @Roles(UserRole.ADMIN)
  updateMessage(
    @Param('id') id: string,
    @Body() body: {
      title?: string;
      content?: string;
      type?: MessageType;
      priority?: MessagePriority;
      targetAudience?: MessageTargetAudience;
      requiresConfirmation?: boolean;
      isActive?: boolean;
    },
  ) {
    return this.messagesService.update(id, body);
  }

  @Delete('messages/:id')
  @Roles(UserRole.ADMIN)
  deleteMessage(@Param('id') id: string) {
    return this.messagesService.delete(id);
  }

  // Shifts - ADMIN and LOGISTICS
  @Get('shifts')
  @Roles(UserRole.ADMIN, UserRole.LOGISTICS)
  getAllShifts(@CurrentUser() user: any) {
    return this.shiftsService.findAll(user);
  }

  @Post('shifts')
  @Roles(UserRole.ADMIN, UserRole.LOGISTICS)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'shifts'),
        filename: (req, file, cb) => {
          const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('סוג קובץ לא נתמך'), false);
        }
      },
    }),
  )
  createShift(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: {
      date: string;
      shiftType: ShiftType;
      message?: string;
    },
  ) {
    const imageUrl = file ? `/uploads/shifts/${file.filename}` : undefined;
    return this.shiftsService.create({
      date: new Date(body.date),
      shiftType: body.shiftType,
      message: body.message,
      imageUrl,
      createdById: user.id,
    });
  }

  @Patch('shifts/:id')
  @Roles(UserRole.ADMIN, UserRole.LOGISTICS)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'shifts'),
        filename: (req, file, cb) => {
          const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
    }),
  )
  updateShift(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: {
      date?: string;
      shiftType?: ShiftType;
      message?: string;
    },
  ) {
    const imageUrl = file ? `/uploads/shifts/${file.filename}` : undefined;
    return this.shiftsService.update(id, {
      ...(body.date && { date: new Date(body.date) }),
      ...(body.shiftType && { shiftType: body.shiftType }),
      ...(body.message && { message: body.message }),
      ...(imageUrl && { imageUrl }),
    });
  }

  @Delete('shifts/:id')
  @Roles(UserRole.ADMIN, UserRole.LOGISTICS)
  deleteShift(@Param('id') id: string) {
    return this.shiftsService.delete(id);
  }

  // Forms - ADMIN and OFFICER (DUTY_OFFICER will have department-scoped view in forms service)
  @Get('forms')
  @Roles(UserRole.ADMIN, UserRole.OFFICER)
  getAllForms() {
    return this.formsService.findAll();
  }

  @Get('forms/pending')
  @Roles(UserRole.ADMIN, UserRole.OFFICER)
  getPendingForms() {
    return this.formsService.findAll(FormStatus.PENDING);
  }

  @Patch('forms/:id')
  @Roles(UserRole.ADMIN, UserRole.OFFICER)
  updateFormStatus(
    @Param('id') id: string,
    @Body() body: { status: FormStatus; adminComment?: string },
  ) {
    return this.formsService.updateStatus(id, body.status, body.adminComment);
  }

  // Soldier Status - ADMIN only
  @Get('status')
  @Roles(UserRole.ADMIN)
  getSoldierStatuses(@CurrentUser() user: any) {
    return this.adminService.getAllUsersWithStatus(user);
  }

  @Patch('status/:soldierId')
  @Roles(UserRole.ADMIN)
  updateSoldierStatus(
    @Param('soldierId') soldierId: string,
    @Body() body: { status: SoldierStatusType; note?: string },
  ) {
    return this.adminService.updateSoldierStatus(soldierId, body.status, body.note);
  }

  // Notifications - ADMIN only
  @Post('notifications/broadcast')
  @Roles(UserRole.ADMIN)
  broadcastNotification(
    @Body() body: { title: string; content: string },
  ) {
    return this.notificationsService.createForAllUsers(body);
  }
}
