import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { FormsService } from './forms.service';
import { CreateFormDto } from './dto/create-form.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('forms')
@UseGuards(JwtAuthGuard)
export class FormsController {
  constructor(private readonly formsService: FormsService) {}

  @Get()
  findByUser(@CurrentUser() user: any) {
    return this.formsService.findByUser(user.id);
  }

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateFormDto) {
    return this.formsService.create(user.id, dto);
  }
}
