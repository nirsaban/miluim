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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { parseIsraelDate } from '../../common/utils/timezone';

@Controller('shift-schedules')
@UseGuards(JwtAuthGuard)
export class ShiftSchedulesController {
  constructor(private readonly shiftSchedulesService: ShiftSchedulesService) {}

  @Get()
  findByDateRange(
    @CurrentUser() user: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('zoneId') zoneId?: string,
  ) {
    return this.shiftSchedulesService.findByDateRange(
      parseIsraelDate(startDate),
      parseIsraelDate(endDate),
      zoneId && zoneId !== 'undefined' ? zoneId : undefined,
      user,
    );
  }

  @Get('status')
  getScheduleStatus(
    @CurrentUser() user: any,
    @Query('date') date: string,
    @Query('zoneId') zoneId?: string,
  ) {
    return this.shiftSchedulesService.getScheduleStatus(
      parseIsraelDate(date),
      zoneId && zoneId !== 'undefined' ? zoneId : undefined,
      user,
    );
  }

  @Get('by-date')
  getByDate(
    @CurrentUser() user: any,
    @Query('date') date: string,
    @Query('zoneId') zoneId?: string,
  ) {
    return this.shiftSchedulesService.findByDate(
      parseIsraelDate(date),
      zoneId && zoneId !== 'undefined' ? zoneId : undefined,
      user,
    );
  }

  @Get('current')
  findOrCreate(
    @CurrentUser() user: any,
    @Query('date') date: string,
    @Query('zoneId') zoneId?: string,
  ) {
    return this.shiftSchedulesService.findOrCreate(
      parseIsraelDate(date),
      zoneId && zoneId !== 'undefined' ? zoneId : undefined,
      user,
    );
  }

  @Post('publish')
  @UseGuards(RolesGuard)
  @Roles('LOGISTICS')
  publish(
    @Query('date') date: string,
    @Query('zoneId') zoneId: string | undefined,
    @Query('shiftTemplateId') shiftTemplateId: string | undefined,
    @Body() _body: any,
    @Request() req: any,
  ) {
    return this.shiftSchedulesService.publish(
      parseIsraelDate(date),
      zoneId && zoneId !== 'undefined' ? zoneId : undefined,
      req.user.id,
      shiftTemplateId && shiftTemplateId !== 'undefined' ? shiftTemplateId : undefined,
    );
  }

  @Post('unpublish')
  @UseGuards(RolesGuard)
  @Roles('LOGISTICS')
  unpublish(
    @Query('date') date: string,
    @Query('zoneId') zoneId?: string,
    @Body() _body?: any,
  ) {
    return this.shiftSchedulesService.unpublish(parseIsraelDate(date), zoneId && zoneId !== 'undefined' ? zoneId : undefined);
  }
}
