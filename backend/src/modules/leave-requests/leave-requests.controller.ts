import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { LeaveRequestsService } from './leave-requests.service';
import { LeaveType, LeaveStatus } from '@prisma/client';

@Controller('leave-requests')
@UseGuards(JwtAuthGuard)
export class LeaveRequestsController {
  constructor(private readonly leaveRequestsService: LeaveRequestsService) {}

  // Soldier endpoints
  @Get('my')
  findMyRequests(@Request() req: any) {
    return this.leaveRequestsService.findUserRequests(req.user.id);
  }

  @Post()
  create(
    @Request() req: any,
    @Body()
    body: {
      type: LeaveType;
      categoryId?: string;
      reason?: string;
      exitTime: string;
      expectedReturn: string;
    },
  ) {
    return this.leaveRequestsService.create(req.user.id, {
      ...body,
      exitTime: new Date(body.exitTime),
      expectedReturn: new Date(body.expectedReturn),
    });
  }

  @Delete(':id')
  cancelRequest(@Request() req: any, @Param('id') id: string) {
    return this.leaveRequestsService.cancelRequest(id, req.user.id);
  }

  // Soldier can confirm their own return from leave
  @Patch('my/:id/return')
  confirmMyReturn(@Request() req: any, @Param('id') id: string) {
    return this.leaveRequestsService.confirmSoldierReturn(id, req.user.id);
  }

  // OFFICER endpoints (manages leave from their department, ADMIN has full access)
  @Get('dashboard')
  @UseGuards(RolesGuard)
  @Roles('OFFICER')
  getDashboard(@Request() req: any) {
    return this.leaveRequestsService.getDashboard(req.user.id, req.user.role);
  }

  @Get('pending')
  @UseGuards(RolesGuard)
  @Roles('OFFICER')
  findPending(@Request() req: any) {
    return this.leaveRequestsService.findPending(req.user.id, req.user.role);
  }

  @Get('active')
  @UseGuards(RolesGuard)
  @Roles('OFFICER')
  findActive(@Request() req: any) {
    return this.leaveRequestsService.findActive(req.user.id, req.user.role);
  }

  @Get('overdue')
  @UseGuards(RolesGuard)
  @Roles('OFFICER')
  findOverdue(@Request() req: any) {
    return this.leaveRequestsService.findOverdue(req.user.id, req.user.role);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('OFFICER')
  findAll(
    @Request() req: any,
    @Query('status') status?: LeaveStatus,
    @Query('type') type?: LeaveType,
    @Query('soldierId') soldierId?: string,
  ) {
    return this.leaveRequestsService.findAll({ status, type, soldierId }, req.user.id, req.user.role);
  }

  @Patch(':id/approve')
  @UseGuards(RolesGuard)
  @Roles('OFFICER')
  approve(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { adminNote?: string },
  ) {
    return this.leaveRequestsService.approve(id, req.user.id, body.adminNote);
  }

  @Patch(':id/reject')
  @UseGuards(RolesGuard)
  @Roles('OFFICER')
  reject(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { adminNote?: string },
  ) {
    return this.leaveRequestsService.reject(id, req.user.id, body.adminNote);
  }

  @Patch(':id/activate')
  @UseGuards(RolesGuard)
  @Roles('OFFICER')
  markActive(@Param('id') id: string) {
    return this.leaveRequestsService.markActive(id);
  }

  @Patch(':id/return')
  @UseGuards(RolesGuard)
  @Roles('OFFICER')
  markReturned(@Param('id') id: string) {
    return this.leaveRequestsService.markReturned(id);
  }
}
