import {
  Controller,
  Get,
  Post,
  Query,
  Body,
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
      zoneId && zoneId !== 'undefined' ? zoneId : undefined,
    );
  }

  @Get('status')
  getScheduleStatus(
    @Query('date') date: string,
    @Query('zoneId') zoneId?: string,
  ) {
    return this.shiftSchedulesService.getScheduleStatus(
      new Date(date),
      zoneId && zoneId !== 'undefined' ? zoneId : undefined,
    );
  }

  @Get('current')
  findOrCreate(
    @Query('date') date: string,
    @Query('zoneId') zoneId?: string,
  ) {
    return this.shiftSchedulesService.findOrCreate(new Date(date), zoneId && zoneId !== 'undefined' ? zoneId : undefined);
  }

  @Post('publish')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'COMMANDER')
  publish(
    @Query('date') date: string,
    @Query('zoneId') zoneId: string | undefined,
    @Body() _body: any,
    @Request() req: any,
  ) {
    return this.shiftSchedulesService.publish(
      new Date(date),
      zoneId && zoneId !== 'undefined' ? zoneId : undefined,
      req.user.id,
    );
  }

  @Post('unpublish')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  unpublish(
    @Query('date') date: string,
    @Query('zoneId') zoneId?: string,
    @Body() _body?: any,
  ) {
    return this.shiftSchedulesService.unpublish(new Date(date), zoneId && zoneId !== 'undefined' ? zoneId : undefined);
  }
}
