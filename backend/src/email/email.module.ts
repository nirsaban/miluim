import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';
import { NotificationService } from './notification.service';

@Module({
  imports: [ConfigModule],
  providers: [EmailService, NotificationService],
  exports: [EmailService, NotificationService],
})
export class EmailModule {}
