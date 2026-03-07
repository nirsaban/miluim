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
} from '@nestjs/common';
import { ShiftAssignmentsService } from './shift-assignments.service';
import { ValidationService } from './validation.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ShiftAssignmentStatus } from '@prisma/client';

@Controller('shift-assignments')
@UseGuards(JwtAuthGuard)
export class ShiftAssignmentsController {
  constructor(
    private readonly shiftAssignmentsService: ShiftAssignmentsService,
    private readonly validationService: ValidationService,
  ) {}

  @Get()
  findByDateRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('zoneId') zoneId?: string,
  ) {
    return this.shiftAssignmentsService.findByDateRange(
      new Date(startDate),
      new Date(endDate),
      zoneId,
    );
  }

  @Get('date/:date')
  findByDate(@Param('date') date: string, @Query('zoneId') zoneId?: string) {
    return this.shiftAssignmentsService.findByDate(new Date(date), zoneId);
  }

  @Get('available-soldiers')
  getAvailableSoldiers(
    @Query('date') date: string,
    @Query('shiftTemplateId') shiftTemplateId: string,
    @Query('taskId') taskId?: string,
  ) {
    return this.shiftAssignmentsService.getAvailableSoldiers(
      new Date(date),
      shiftTemplateId,
      taskId,
    );
  }

  @Get('fulfillment')
  getTaskFulfillment(
    @Query('date') date: string,
    @Query('shiftTemplateId') shiftTemplateId: string,
    @Query('taskId') taskId: string,
  ) {
    return this.shiftAssignmentsService.getTaskFulfillment(
      new Date(date),
      shiftTemplateId,
      taskId,
    );
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'COMMANDER')
  create(
    @Body()
    data: {
      date: string;
      shiftTemplateId: string;
      taskId: string;
      soldierId: string;
      notes?: string;
    },
  ) {
    return this.shiftAssignmentsService.create({
      ...data,
      date: new Date(data.date),
    });
  }

  @Post('bulk')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'COMMANDER')
  bulkCreate(
    @Body()
    data: {
      assignments: {
        date: string;
        shiftTemplateId: string;
        taskId: string;
        soldierId: string;
        notes?: string;
      }[];
    },
  ) {
    return this.shiftAssignmentsService.bulkCreate(
      data.assignments.map((a) => ({
        ...a,
        date: new Date(a.date),
      })),
    );
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'COMMANDER')
  update(
    @Param('id') id: string,
    @Body() data: { status?: ShiftAssignmentStatus; notes?: string },
  ) {
    return this.shiftAssignmentsService.update(id, data);
  }

  @Patch(':id/move')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'COMMANDER')
  moveAssignment(
    @Param('id') id: string,
    @Body()
    data: {
      newTaskId: string;
      newShiftTemplateId?: string;
      newDate?: string;
    },
  ) {
    return this.shiftAssignmentsService.moveAssignment(
      id,
      data.newTaskId,
      data.newShiftTemplateId,
      data.newDate ? new Date(data.newDate) : undefined,
    );
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'COMMANDER')
  delete(@Param('id') id: string) {
    return this.shiftAssignmentsService.delete(id);
  }

  @Get('validate')
  validateAssignment(
    @Query('date') date: string,
    @Query('shiftTemplateId') shiftTemplateId: string,
    @Query('taskId') taskId: string,
    @Query('soldierId') soldierId: string,
  ) {
    return this.validationService.validateAssignment(
      new Date(date),
      shiftTemplateId,
      taskId,
      soldierId,
    );
  }

  @Get('validate-day')
  validateDaySchedule(
    @Query('date') date: string,
    @Query('zoneId') zoneId?: string,
  ) {
    return this.validationService.validateDaySchedule(new Date(date), zoneId);
  }
}
