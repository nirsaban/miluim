import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { MessageType } from '@prisma/client';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  findAll(@Query('type') type?: MessageType) {
    return this.messagesService.findAll(type);
  }

  @Get('food')
  findFoodMessages() {
    return this.messagesService.findByType(MessageType.FOOD);
  }

  @Get('operational')
  findOperationalMessages() {
    return this.messagesService.findByType(MessageType.OPERATIONAL);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.messagesService.findOne(id);
  }
}
