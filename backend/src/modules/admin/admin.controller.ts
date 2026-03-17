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

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.OFFICER)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly messagesService: MessagesService,
    private readonly shiftsService: ShiftsService,
    private readonly formsService: FormsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get('dashboard')
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  // Messages
  @Get('messages')
  getAllMessages() {
    return this.messagesService.findAll();
  }

  @Post('messages')
  createMessage(
    @Body() body: {
      title: string;
      content: string;
      type?: MessageType;
      priority?: MessagePriority;
      targetAudience?: MessageTargetAudience;
      requiresConfirmation?: boolean;
    },
  ) {
    return this.messagesService.create(body);
  }

  @Patch('messages/:id')
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
  deleteMessage(@Param('id') id: string) {
    return this.messagesService.delete(id);
  }

  // Shifts
  @Get('shifts')
  getAllShifts() {
    return this.shiftsService.findAll();
  }

  @Post('shifts')
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
  deleteShift(@Param('id') id: string) {
    return this.shiftsService.delete(id);
  }

  // Forms
  @Get('forms')
  getAllForms() {
    return this.formsService.findAll();
  }

  @Get('forms/pending')
  getPendingForms() {
    return this.formsService.findAll(FormStatus.PENDING);
  }

  @Patch('forms/:id')
  updateFormStatus(
    @Param('id') id: string,
    @Body() body: { status: FormStatus; adminComment?: string },
  ) {
    return this.formsService.updateStatus(id, body.status, body.adminComment);
  }

  // Soldier Status
  @Get('status')
  getSoldierStatuses() {
    return this.adminService.getAllUsersWithStatus();
  }

  @Patch('status/:soldierId')
  updateSoldierStatus(
    @Param('soldierId') soldierId: string,
    @Body() body: { status: SoldierStatusType; note?: string },
  ) {
    return this.adminService.updateSoldierStatus(soldierId, body.status, body.note);
  }

  // Notifications
  @Post('notifications/broadcast')
  broadcastNotification(
    @Body() body: { title: string; content: string },
  ) {
    return this.notificationsService.createForAllUsers(body);
  }
}
