import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ServiceCyclesService } from './service-cycles.service';
import { ReserveServiceCycleStatus } from '@prisma/client';

@Controller('service-cycles')
@UseGuards(JwtAuthGuard)
export class ServiceCyclesController {
  constructor(private readonly serviceCyclesService: ServiceCyclesService) {}

  // Get current active cycle - available to all authenticated users
  @Get('current')
  getCurrentActive() {
    return this.serviceCyclesService.findCurrentActive();
  }

  // Get current cycle summary - available to all authenticated users
  @Get('current/summary')
  getCurrentCycleSummary() {
    return this.serviceCyclesService.getCurrentCycleSummary();
  }

  // Admin: Get all cycles
  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'OFFICER', 'COMMANDER')
  findAll() {
    return this.serviceCyclesService.findAll();
  }

  // Admin: Get cycle by ID
  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'OFFICER', 'COMMANDER')
  findById(@Param('id') id: string) {
    return this.serviceCyclesService.findById(id);
  }

  // Admin: Create new cycle
  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'OFFICER', 'COMMANDER')
  create(
    @Request() req: any,
    @Body()
    body: {
      name: string;
      description?: string;
      startDate: string;
      endDate?: string;
      location?: string;
      locationLat?: number;
      locationLng?: number;
      status?: ReserveServiceCycleStatus;
    },
  ) {
    return this.serviceCyclesService.create(req.user.id, {
      ...body,
      startDate: new Date(body.startDate),
      endDate: body.endDate ? new Date(body.endDate) : undefined,
    });
  }

  // Admin: Update cycle
  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'OFFICER', 'COMMANDER')
  update(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      description?: string;
      startDate?: string;
      endDate?: string;
      location?: string;
      locationLat?: number;
      locationLng?: number;
      status?: ReserveServiceCycleStatus;
    },
  ) {
    return this.serviceCyclesService.update(id, {
      ...body,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
    });
  }

  // Admin: Delete cycle
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'OFFICER', 'COMMANDER')
  delete(@Param('id') id: string) {
    return this.serviceCyclesService.delete(id);
  }

  // Admin: Initialize attendance records for all users
  @Post(':id/initialize-attendance')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'OFFICER', 'COMMANDER')
  initializeAttendance(@Param('id') id: string) {
    return this.serviceCyclesService.initializeAttendanceRecords(id);
  }
}
