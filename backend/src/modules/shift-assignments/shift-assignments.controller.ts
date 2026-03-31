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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ShiftAssignmentStatus } from '@prisma/client';
import { parseIsraelDate } from '../../common/utils/timezone';

@Controller('shift-assignments')
@UseGuards(JwtAuthGuard)
export class ShiftAssignmentsController {
  constructor(
    private readonly shiftAssignmentsService: ShiftAssignmentsService,
    private readonly validationService: ValidationService,
  ) {}

  @Get('my-shifts')
  findMyShifts(@CurrentUser() user: any) {
    return this.shiftAssignmentsService.findMyShifts(user.id);
  }

  // ============================================================
  // ACTIVE SHIFT MANAGEMENT ENDPOINTS
  // ============================================================

  @Get('active/today')
  getTodayActiveShifts(@Query('zoneId') zoneId?: string) {
    return this.shiftAssignmentsService.getTodayActiveShifts(
      zoneId && zoneId !== 'undefined' ? zoneId : undefined,
    );
  }

  @Get('active/my-shift')
  getMyTodayShift(@CurrentUser() user: any) {
    return this.shiftAssignmentsService.getMyTodayShift(user.id);
  }

  @Get('active/officer-duty')
  getShiftOfficerDuty(@CurrentUser() user: any) {
    return this.shiftAssignmentsService.getShiftOfficerDuty(user.id);
  }

  @Post('active/:id/arrive')
  confirmArrival(@Param('id') id: string, @CurrentUser() user: any) {
    return this.shiftAssignmentsService.confirmArrival(id, user.id);
  }

  @Patch('active/:id/status')
  updateActiveStatus(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() data: { batteryLevel?: number },
  ) {
    return this.shiftAssignmentsService.updateActiveStatus(id, user.id, data);
  }

  @Post('active/:id/arrive-supervisor')
  confirmArrivalBySupervisor(@Param('id') id: string, @CurrentUser() user: any) {
    return this.shiftAssignmentsService.confirmArrivalBySupervisor(id, user.id);
  }

  @Patch('active/:id/equipment')
  updateEquipmentStatus(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() data: { batteryLevel?: number; missingItems?: string },
  ) {
    return this.shiftAssignmentsService.updateEquipmentStatus(id, user.id, data);
  }

  @Get('active/shift-overview')
  getCurrentShiftOverview(@CurrentUser() user: any) {
    return this.shiftAssignmentsService.getCurrentShiftOverview(user.id);
  }

  @Get('active/current-shift-only')
  getCurrentShiftOnlyOverview(@CurrentUser() user: any) {
    return this.shiftAssignmentsService.getCurrentShiftOnlyOverview(user.id);
  }

  @Get('active/current-commanders')
  getCurrentShiftCommanders(@CurrentUser() user: any) {
    return this.shiftAssignmentsService.getCurrentShiftCommanders(user.id);
  }

  @Post('active/submission/:id/confirm')
  confirmSubmissionReceipt(@Param('id') id: string, @CurrentUser() user: any) {
    return this.shiftAssignmentsService.confirmSubmissionReceipt(id, user.id);
  }

  @Patch('schedule/:id/officer')
  @UseGuards(RolesGuard)
  @Roles('LOGISTICS')
  assignShiftOfficer(
    @Param('id') id: string,
    @Body() data: { officerId: string },
  ) {
    return this.shiftAssignmentsService.assignShiftOfficer(id, data.officerId);
  }

  @Get()
  findByDateRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('zoneId') zoneId?: string,
  ) {
    return this.shiftAssignmentsService.findByDateRange(
      parseIsraelDate(startDate),
      parseIsraelDate(endDate),
      zoneId && zoneId !== 'undefined' ? zoneId : undefined,
    );
  }

  @Get('date/:date')
  findByDate(@Param('date') date: string, @Query('zoneId') zoneId?: string) {
    return this.shiftAssignmentsService.findByDate(parseIsraelDate(date), zoneId && zoneId !== 'undefined' ? zoneId : undefined);
  }

  @Get('available-soldiers')
  getAvailableSoldiers(
    @Query('date') date: string,
    @Query('shiftTemplateId') shiftTemplateId: string,
    @Query('taskId') taskId?: string,
  ) {
    return this.shiftAssignmentsService.getAvailableSoldiers(
      parseIsraelDate(date),
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
      parseIsraelDate(date),
      shiftTemplateId,
      taskId,
    );
  }

  // LOGISTICS manages all shift operations
  @Post()
  @UseGuards(RolesGuard)
  @Roles('LOGISTICS')
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
      date: parseIsraelDate(data.date),
    });
  }

  @Post('bulk')
  @UseGuards(RolesGuard)
  @Roles('LOGISTICS')
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
        date: parseIsraelDate(a.date),
      })),
    );
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('LOGISTICS')
  update(
    @Param('id') id: string,
    @Body() data: { status?: ShiftAssignmentStatus; notes?: string },
  ) {
    return this.shiftAssignmentsService.update(id, data);
  }

  @Patch(':id/move')
  @UseGuards(RolesGuard)
  @Roles('LOGISTICS')
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
      data.newDate ? parseIsraelDate(data.newDate) : undefined,
    );
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('LOGISTICS')
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
      parseIsraelDate(date),
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
    return this.validationService.validateDaySchedule(parseIsraelDate(date), zoneId && zoneId !== 'undefined' ? zoneId : undefined);
  }

  // ============================================================
  // WORKLOAD ANALYTICS ENDPOINTS
  // ============================================================

  @Get('workloads')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'OFFICER', 'LOGISTICS')
  getWorkloadsSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.shiftAssignmentsService.getWorkloadsSummary({
      startDate: startDate ? parseIsraelDate(startDate) : undefined,
      endDate: endDate ? parseIsraelDate(endDate) : undefined,
      departmentId: departmentId && departmentId !== 'undefined' ? departmentId : undefined,
    });
  }

  @Get('workloads/my')
  getMyWorkload(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.shiftAssignmentsService.getUserWorkload(user.id, {
      startDate: startDate ? parseIsraelDate(startDate) : undefined,
      endDate: endDate ? parseIsraelDate(endDate) : undefined,
    });
  }
}
