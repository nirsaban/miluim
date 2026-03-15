import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { PushService } from './push.service';

interface SubscribeDto {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

@Controller('push')
@UseGuards(JwtAuthGuard)
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Public()
  @Get('vapid-public-key')
  getVapidPublicKey() {
    const key = this.pushService.getVapidPublicKey();
    return { publicKey: key };
  }

  @Post('subscribe')
  async subscribe(
    @CurrentUser('id') userId: string,
    @Body() subscription: SubscribeDto,
  ) {
    await this.pushService.subscribe(userId, subscription);
    return { success: true, message: 'נרשמת לקבלת התראות' };
  }

  @Delete('unsubscribe')
  async unsubscribe(
    @CurrentUser('id') userId: string,
    @Body('endpoint') endpoint: string,
  ) {
    await this.pushService.unsubscribe(userId, endpoint);
    return { success: true, message: 'הוסרת מרשימת ההתראות' };
  }

  @Delete('unsubscribe-all')
  async unsubscribeAll(@CurrentUser('id') userId: string) {
    await this.pushService.unsubscribeAll(userId);
    return { success: true, message: 'הוסרת מכל ההתראות' };
  }

  @Post('test')
  async sendTestNotification(@CurrentUser('id') userId: string) {
    const result = await this.pushService.sendToUser(userId, {
      title: 'בדיקת התראה',
      body: 'זוהי התראת בדיקה מהמערכת',
      url: '/dashboard',
    });
    return { success: true, ...result };
  }
}
