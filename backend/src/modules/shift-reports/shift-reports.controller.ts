import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ShiftReportsService } from './shift-reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('shift-reports')
@UseGuards(JwtAuthGuard)
export class ShiftReportsController {
  constructor(private readonly shiftReportsService: ShiftReportsService) {}

  @Post()
  create(
    @CurrentUser() user: any,
    @Body() data: any,
  ) {
    return this.shiftReportsService.create(user.id, data);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'OFFICER', 'LOGISTICS')
  findAll(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('userId') userId?: string,
    @Query('taskId') taskId?: string,
    @Query('zoneId') zoneId?: string,
    @Query('eventNumber') eventNumber?: string,
  ) {
    return this.shiftReportsService.findAll({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      userId,
      taskId,
      zoneId,
      eventNumber,
    });
  }

  @Get('assignment/:assignmentId')
  findByAssignment(@Param('assignmentId') assignmentId: string) {
    return this.shiftReportsService.findByAssignment(assignmentId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.shiftReportsService.findOne(id);
  }

  @Get(':id/export')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'OFFICER', 'LOGISTICS')
  async exportDocx(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const buffer = await this.shiftReportsService.generateDocx(id);
    const report = await this.shiftReportsService.findOne(id);
    
    const filename = `report-${report.eventNumber || 'summary'}-${format(report.reportDate, 'yyyy-MM-dd')}.docx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(filename)}`);
    res.send(buffer);
  }
}

// Helper to format date for filename
function format(date: Date, formatStr: string): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
