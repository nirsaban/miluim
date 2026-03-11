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
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ServiceChecklistService } from './service-checklist.service';
import { ServiceChecklistCategory } from '@prisma/client';

@Controller('service-checklist')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'OFFICER', 'COMMANDER')
export class ServiceChecklistController {
  constructor(
    private readonly serviceChecklistService: ServiceChecklistService,
  ) {}

  // Get all checklist items for current cycle
  @Get('current')
  getAllForCurrentCycle() {
    return this.serviceChecklistService.getAllForCurrentCycle();
  }

  // Get checklist summary
  @Get('current/summary')
  getSummary(@Query('cycleId') cycleId?: string) {
    return this.serviceChecklistService.getSummary(cycleId);
  }

  // Get all checklist items for a specific cycle
  @Get('cycle/:cycleId')
  getAllForCycle(@Param('cycleId') cycleId: string) {
    return this.serviceChecklistService.getAllForCycle(cycleId);
  }

  // Create new checklist item for current cycle
  @Post('current')
  createForCurrentCycle(
    @Body()
    body: {
      category: ServiceChecklistCategory;
      title: string;
      description?: string;
      sortOrder?: number;
    },
  ) {
    return this.serviceChecklistService.createForCurrentCycle(body);
  }

  // Create new checklist item for specific cycle
  @Post('cycle/:cycleId')
  create(
    @Param('cycleId') cycleId: string,
    @Body()
    body: {
      category: ServiceChecklistCategory;
      title: string;
      description?: string;
      sortOrder?: number;
    },
  ) {
    return this.serviceChecklistService.create(cycleId, body);
  }

  // Create default checklist items for a cycle
  @Post('cycle/:cycleId/defaults')
  createDefaults(@Param('cycleId') cycleId: string) {
    return this.serviceChecklistService.createDefaultItems(cycleId);
  }

  // Update a checklist item
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: {
      category?: ServiceChecklistCategory;
      title?: string;
      description?: string;
      notes?: string;
      sortOrder?: number;
    },
  ) {
    return this.serviceChecklistService.update(id, body);
  }

  // Mark item as complete
  @Patch(':id/complete')
  markComplete(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { notes?: string },
  ) {
    return this.serviceChecklistService.markComplete(
      id,
      req.user.id,
      body.notes,
    );
  }

  // Mark item as incomplete
  @Patch(':id/incomplete')
  markIncomplete(@Param('id') id: string) {
    return this.serviceChecklistService.markIncomplete(id);
  }

  // Delete a checklist item
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.serviceChecklistService.delete(id);
  }
}
