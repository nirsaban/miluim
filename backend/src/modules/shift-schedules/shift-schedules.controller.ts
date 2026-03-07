import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ShiftSchedulesService } from './shift-schedules.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('shift-schedules')
@UseGuards(JwtAuthGuard)
export class ShiftSchedulesController {
  constructor(private readonly shiftSchedulesService: ShiftSchedulesService) {}

  @Get()
  findByDateRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('zoneId') zoneId?: string,
  ) {
    return this.shiftSchedulesService.findByDateRange(
      new Date(startDate),
      new Date(endDate),
      zoneId,
    );
  }

  @Get('status')
  getScheduleStatus(
    @Query('date') date: string,
    @Query('zoneId') zoneId?: string,
  ) {
    return this.shiftSchedulesService.getScheduleStatus(
      new Date(date),
      zoneId,
    );
  }

  @Get('current')
  findOrCreate(
    @Query('date') date: string,
    @Query('zoneId') zoneId?: string,
  ) {
    return this.shiftSchedulesService.findOrCreate(new Date(date), zoneId);
  }

  @Post('publish')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'COMMANDER')
  publish(
    @Query('date') date: string,
    @Query('zoneId') zoneId: string | undefined,
    @Request() req: any,
  ) {
    return this.shiftSchedulesService.publish(
      new Date(date),
      zoneId,
      req.user.id,
    );
  }

  @Post('unpublish')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  unpublish(
    @Query('date') date: string,
    @Query('zoneId') zoneId?: string,
  ) {
    return this.shiftSchedulesService.unpublish(new Date(date), zoneId);
  }
}
