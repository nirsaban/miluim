import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { BattalionService } from './battalion.service';
import { CreateBattalionDto } from './dto/create-battalion.dto';
import { UpdateBattalionDto } from './dto/update-battalion.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('battalions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BattalionController {
  constructor(private readonly battalionService: BattalionService) {}

  @Post()
  @Roles(UserRole.SYSTEM_TECHNICAL, UserRole.BATTALION_ADMIN)
  create(@Body() dto: CreateBattalionDto) {
    return this.battalionService.create(dto);
  }

  @Get()
  @Roles(UserRole.BATTALION_ADMIN, UserRole.SYSTEM_TECHNICAL)
  findAll() {
    return this.battalionService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.BATTALION_ADMIN, UserRole.SYSTEM_TECHNICAL)
  findOne(@Param('id') id: string) {
    return this.battalionService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.BATTALION_ADMIN, UserRole.SYSTEM_TECHNICAL)
  update(@Param('id') id: string, @Body() dto: UpdateBattalionDto) {
    return this.battalionService.update(id, dto);
  }
}
