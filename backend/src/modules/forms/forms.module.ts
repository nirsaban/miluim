import { Module } from '@nestjs/common';
import { FormsService } from './forms.service';
import { FormsController } from './forms.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailModule } from '../../email/email.module';

@Module({
  imports: [NotificationsModule, EmailModule],
  controllers: [FormsController],
  providers: [FormsService],
  exports: [FormsService],
})
export class FormsModule {}
