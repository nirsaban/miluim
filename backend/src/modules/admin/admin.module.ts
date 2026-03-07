import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { MessagesModule } from '../messages/messages.module';
import { ShiftsModule } from '../shifts/shifts.module';
import { FormsModule } from '../forms/forms.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UploadModule } from '../../upload/upload.module';

@Module({
  imports: [
    MessagesModule,
    ShiftsModule,
    FormsModule,
    NotificationsModule,
    UploadModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
