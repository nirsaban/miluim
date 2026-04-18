import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BattalionDashboardService } from './battalion-dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('battalion-dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.BATTALION_ADMIN, UserRole.SYSTEM_TECHNICAL)
export class BattalionDashboardController {
  constructor(
    private readonly dashboardService: BattalionDashboardService,
  ) {}

  @Get('overview')
  getOverview(@CurrentUser() user: any) {
    return this.dashboardService.getOverview(user);
  }

  @Get('attendance')
  getAttendance(
    @CurrentUser() user: any,
    @Query('companyId') companyId?: string,
  ) {
    return this.dashboardService.getAttendance(user, companyId);
  }

  @Get('manpower')
  getManpower(@CurrentUser() user: any) {
    return this.dashboardService.getManpower(user);
  }

  @Get('leaves')
  getLeaves(
    @CurrentUser() user: any,
    @Query('companyId') companyId?: string,
  ) {
    return this.dashboardService.getLeaves(user, companyId);
  }

  @Get('active-services')
  getActiveServices(@CurrentUser() user: any) {
    return this.dashboardService.getActiveServices(user);
  }

  @Get('map')
  getMapData(@CurrentUser() user: any) {
    return this.dashboardService.getMapData(user);
  }

  @Get('company/:id')
  getCompanyDetail(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.dashboardService.getCompanyDetail(id, user);
  }
}
