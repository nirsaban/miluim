import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MessageType } from '@prisma/client';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  findAll(@Query('type') type?: MessageType) {
    return this.messagesService.findAll(type);
  }

  @Get('with-status')
  findAllWithStatus(@CurrentUser() user: any, @Query('type') type?: MessageType) {
    return this.messagesService.findAllWithConfirmationStatus(user.id, type);
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

  @Post(':id/confirm')
  confirmMessage(@Param('id') id: string, @CurrentUser() user: any) {
    return this.messagesService.confirmMessage(id, user.id);
  }

  @Get(':id/confirmations')
  @UseGuards(RolesGuard)
  @Roles('COMMANDER')
  getMessageConfirmations(@Param('id') id: string) {
    return this.messagesService.getMessageConfirmations(id);
  }

  @Get(':id/analytics')
  @UseGuards(RolesGuard)
  @Roles('COMMANDER')
  getMessageAnalytics(@Param('id') id: string) {
    return this.messagesService.getMessageAnalytics(id);
  }
}
