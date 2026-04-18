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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ServiceCyclesService } from './service-cycles.service';
import { ReserveServiceCycleStatus } from '@prisma/client';

@Controller('service-cycles')
@UseGuards(JwtAuthGuard)
export class ServiceCyclesController {
  constructor(private readonly serviceCyclesService: ServiceCyclesService) {}

  @Get('current')
  getCurrentActive(@CurrentUser() user: any) {
    return this.serviceCyclesService.findCurrentActive(user);
  }

  @Get('current/summary')
  getCurrentCycleSummary(@CurrentUser() user: any) {
    return this.serviceCyclesService.getCurrentCycleSummary(user);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'OFFICER', 'COMMANDER')
  findAll(@CurrentUser() user: any) {
    return this.serviceCyclesService.findAll(user);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'OFFICER', 'COMMANDER')
  findById(@Param('id') id: string) {
    return this.serviceCyclesService.findById(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'OFFICER', 'COMMANDER')
  create(
    @Request() req: any,
    @CurrentUser() user: any,
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
    }, user);
  }

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

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'OFFICER', 'COMMANDER')
  delete(@Param('id') id: string) {
    return this.serviceCyclesService.delete(id);
  }

  @Post(':id/initialize-attendance')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'OFFICER', 'COMMANDER')
  initializeAttendance(@Param('id') id: string, @CurrentUser() user: any) {
    return this.serviceCyclesService.initializeAttendanceRecords(id, user);
  }
}
