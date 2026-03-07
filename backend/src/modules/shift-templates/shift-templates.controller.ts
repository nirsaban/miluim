import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ShiftTemplatesService } from './shift-templates.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('shift-templates')
@UseGuards(JwtAuthGuard)
export class ShiftTemplatesController {
  constructor(private readonly shiftTemplatesService: ShiftTemplatesService) {}

  @Get()
  findAll() {
    return this.shiftTemplatesService.findAll();
  }

  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  findAllAdmin() {
    return this.shiftTemplatesService.findAllAdmin();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.shiftTemplatesService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  create(
    @Body()
    data: {
      name: string;
      displayName: string;
      startTime: string;
      endTime: string;
      color?: string;
      sortOrder?: number;
    },
  ) {
    return this.shiftTemplatesService.create(data);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  update(
    @Param('id') id: string,
    @Body()
    data: {
      name?: string;
      displayName?: string;
      startTime?: string;
      endTime?: string;
      color?: string;
      sortOrder?: number;
      isActive?: boolean;
    },
  ) {
    return this.shiftTemplatesService.update(id, data);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  delete(@Param('id') id: string) {
    return this.shiftTemplatesService.delete(id);
  }
}
