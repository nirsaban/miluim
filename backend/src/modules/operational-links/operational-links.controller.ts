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
import { OperationalLinksService } from './operational-links.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('operational-links')
@UseGuards(JwtAuthGuard)
export class OperationalLinksController {
  constructor(private readonly operationalLinksService: OperationalLinksService) {}

  @Get()
  findAll() {
    return this.operationalLinksService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.operationalLinksService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('LOGISTICS')
  create(
    @CurrentUser() user: any,
    @Body() body: { title: string; description?: string; url: string },
  ) {
    return this.operationalLinksService.create({
      title: body.title,
      description: body.description,
      url: body.url,
      createdById: user.id,
    });
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('LOGISTICS')
  update(
    @Param('id') id: string,
    @Body() body: { title?: string; description?: string; url?: string; isActive?: boolean },
  ) {
    return this.operationalLinksService.update(id, body);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('LOGISTICS')
  delete(@Param('id') id: string) {
    return this.operationalLinksService.delete(id);
  }
}
