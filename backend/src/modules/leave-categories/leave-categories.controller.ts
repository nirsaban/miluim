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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { LeaveCategoriesService } from './leave-categories.service';

@Controller('leave-categories')
@UseGuards(JwtAuthGuard)
export class LeaveCategoriesController {
  constructor(private readonly leaveCategoriesService: LeaveCategoriesService) {}

  @Get()
  findAll() {
    return this.leaveCategoriesService.findAll();
  }

  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  findAllAdmin() {
    return this.leaveCategoriesService.findAllAdmin();
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  create(@Body() body: { name: string; displayName: string; icon?: string }) {
    return this.leaveCategoriesService.create(body);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  update(
    @Param('id') id: string,
    @Body() body: { name?: string; displayName?: string; icon?: string; isActive?: boolean },
  ) {
    return this.leaveCategoriesService.update(id, body);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  delete(@Param('id') id: string) {
    return this.leaveCategoriesService.delete(id);
  }
}
