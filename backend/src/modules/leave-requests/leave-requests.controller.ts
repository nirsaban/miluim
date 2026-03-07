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

  // Admin endpoints
  @Get('dashboard')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'OFFICER', 'COMMANDER')
  getDashboard() {
    return this.leaveRequestsService.getDashboard();
  }

  @Get('pending')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'OFFICER', 'COMMANDER')
  findPending() {
    return this.leaveRequestsService.findPending();
  }

  @Get('active')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'OFFICER', 'COMMANDER')
  findActive() {
    return this.leaveRequestsService.findActive();
  }

  @Get('overdue')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'OFFICER', 'COMMANDER')
  findOverdue() {
    return this.leaveRequestsService.findOverdue();
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'OFFICER', 'COMMANDER')
  findAll(
    @Query('status') status?: LeaveStatus,
    @Query('type') type?: LeaveType,
    @Query('soldierId') soldierId?: string,
  ) {
    return this.leaveRequestsService.findAll({ status, type, soldierId });
  }

  @Patch(':id/approve')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'OFFICER', 'COMMANDER')
  approve(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { adminNote?: string },
  ) {
    return this.leaveRequestsService.approve(id, req.user.id, body.adminNote);
  }

  @Patch(':id/reject')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'OFFICER', 'COMMANDER')
  reject(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { adminNote?: string },
  ) {
    return this.leaveRequestsService.reject(id, req.user.id, body.adminNote);
  }

  @Patch(':id/activate')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'OFFICER', 'COMMANDER')
  markActive(@Param('id') id: string) {
    return this.leaveRequestsService.markActive(id);
  }

  @Patch(':id/return')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'OFFICER', 'COMMANDER')
  markReturned(@Param('id') id: string) {
    return this.leaveRequestsService.markReturned(id);
  }
}
