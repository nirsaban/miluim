import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

interface TaskRequirementInput {
  skillId: string;
  quantity: number;
}

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  findAll() {
    return this.tasksService.findAll();
  }

  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  findAllAdmin() {
    return this.tasksService.findAllAdmin();
  }

  @Get('zone/:zoneId')
  findByZone(@Param('zoneId') zoneId: string) {
    return this.tasksService.findByZone(zoneId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  create(
    @Body()
    data: {
      zoneId: string;
      name: string;
      description?: string;
      requiredPeopleCount?: number;
      requirements?: TaskRequirementInput[];
      checklistItems?: {
        label: string;
        description?: string;
        externalLink?: string;
        isRequired?: boolean;
        sortOrder?: number;
      }[];
    },
  ) {
    return this.tasksService.create(data);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  update(
    @Param('id') id: string,
    @Body() data: { 
      name?: string; 
      description?: string; 
      isActive?: boolean; 
      zoneId?: string; 
      requiredPeopleCount?: number;
      checklistItems?: {
        id?: string;
        label: string;
        description?: string;
        externalLink?: string;
        isRequired?: boolean;
        sortOrder?: number;
        isActive?: boolean;
      }[];
    },
  ) {
    return this.tasksService.update(id, data);
  }

  @Put(':id/requirements')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  updateRequirements(
    @Param('id') id: string,
    @Body() data: { requirements: TaskRequirementInput[] },
  ) {
    return this.tasksService.updateRequirements(id, data.requirements);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  delete(@Param('id') id: string) {
    return this.tasksService.delete(id);
  }
}
