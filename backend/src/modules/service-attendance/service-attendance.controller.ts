import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ServiceAttendanceService } from './service-attendance.service';
import { ServiceAttendanceStatus } from '@prisma/client';

@Controller('service-attendance')
@UseGuards(JwtAuthGuard)
export class ServiceAttendanceController {
  constructor(
    private readonly serviceAttendanceService: ServiceAttendanceService,
  ) {}

  // Soldier: Get my attendance for current cycle
  @Get('current/me')
  getMyCurrentAttendance(@Request() req: any) {
    return this.serviceAttendanceService.getMyCurrentAttendance(req.user.id);
  }

  // Soldier: Update my attendance for current cycle
  @Patch('current/me')
  updateMyCurrentAttendance(
    @Request() req: any,
    @Body()
    body: {
      attendanceStatus?: ServiceAttendanceStatus;
      cannotAttendReason?: string;
      onboardGunNumber?: string;
      hotelRoomNumber?: string;
      notes?: string;
    },
  ) {
    return this.serviceAttendanceService.updateMyCurrentAttendance(
      req.user.id,
      body,
    );
  }

  // Admin: Get all attendances for current cycle
  @Get('current/list')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'OFFICER', 'COMMANDER')
  getAllForCurrentCycle() {
    return this.serviceAttendanceService.getAllForCurrentCycle();
  }

  // Admin: Get attendance statistics for charts
  @Get('current/stats')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'OFFICER', 'COMMANDER')
  getAttendanceStats(@Query('cycleId') cycleId?: string) {
    return this.serviceAttendanceService.getAttendanceStats(cycleId);
  }

  // Admin: Get attendance statistics by department
  @Get('current/by-department')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'OFFICER', 'COMMANDER')
  getAttendanceByDepartment(@Query('cycleId') cycleId?: string) {
    return this.serviceAttendanceService.getAttendanceByDepartment(cycleId);
  }

  // Admin: Get all attendances for a specific cycle
  @Get('cycle/:cycleId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'OFFICER', 'COMMANDER')
  getAllForCycle(@Param('cycleId') cycleId: string) {
    return this.serviceAttendanceService.getAllForCycle(cycleId);
  }

  // Admin: Get specific user's attendance
  @Get('user/:userId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'OFFICER', 'COMMANDER')
  getAttendanceByUserId(
    @Param('userId') userId: string,
    @Query('cycleId') cycleId?: string,
  ) {
    return this.serviceAttendanceService.getAttendanceByUserId(userId, cycleId);
  }

  // Admin: Update any attendance record
  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'OFFICER', 'COMMANDER')
  updateAttendance(
    @Param('id') id: string,
    @Body()
    body: {
      attendanceStatus?: ServiceAttendanceStatus;
      cannotAttendReason?: string;
      onboardGunNumber?: string;
      hotelRoomNumber?: string;
      notes?: string;
      totalActiveDays?: number;
      checkInAt?: string;
      checkOutAt?: string;
    },
  ) {
    return this.serviceAttendanceService.updateAttendance(id, {
      ...body,
      checkInAt: body.checkInAt ? new Date(body.checkInAt) : undefined,
      checkOutAt: body.checkOutAt ? new Date(body.checkOutAt) : undefined,
    });
  }
}
