import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { MessagesModule } from './modules/messages/messages.module';
import { ShiftsModule } from './modules/shifts/shifts.module';
import { FormsModule } from './modules/forms/forms.module';
import { SocialModule } from './modules/social/social.module';
import { RecommendationsModule } from './modules/recommendations/recommendations.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AdminModule } from './modules/admin/admin.module';
import { HealthModule } from './modules/health/health.module';
import { OperationalLinksModule } from './modules/operational-links/operational-links.module';
import { LeaveCategoriesModule } from './modules/leave-categories/leave-categories.module';
import { LeaveRequestsModule } from './modules/leave-requests/leave-requests.module';
import { SkillsModule } from './modules/skills/skills.module';
import { ZonesModule } from './modules/zones/zones.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { ShiftTemplatesModule } from './modules/shift-templates/shift-templates.module';
import { ShiftAssignmentsModule } from './modules/shift-assignments/shift-assignments.module';
import { ShiftSchedulesModule } from './modules/shift-schedules/shift-schedules.module';
import { CsvImportModule } from './modules/csv-import/csv-import.module';
import { EmailModule } from './email/email.module';
import { UploadModule } from './upload/upload.module';
import { ServiceCyclesModule } from './modules/service-cycles/service-cycles.module';
import { ServiceAttendanceModule } from './modules/service-attendance/service-attendance.module';
import { ServiceChecklistModule } from './modules/service-checklist/service-checklist.module';
import { PushModule } from './modules/push/push.module';
import { WebAuthnModule } from './modules/webauthn/webauthn.module';
import { TestSetupModule } from './modules/test-setup/test-setup.module';
import { SystemModule } from './modules/system/system.module';
import { SocialActivitiesModule } from './modules/social-activities/social-activities.module';
import { EmergencyModule } from './modules/emergency/emergency.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
      serveStaticOptions: {
        index: false,
      },
    }),
    PrismaModule,
    EmailModule,
    UploadModule,
    AuthModule,
    UsersModule,
    MessagesModule,
    ShiftsModule,
    FormsModule,
    SocialModule,
    RecommendationsModule,
    NotificationsModule,
    AdminModule,
    HealthModule,
    OperationalLinksModule,
    LeaveCategoriesModule,
    LeaveRequestsModule,
    SkillsModule,
    ZonesModule,
    TasksModule,
    ShiftTemplatesModule,
    ShiftAssignmentsModule,
    ShiftSchedulesModule,
    CsvImportModule,
    ServiceCyclesModule,
    ServiceAttendanceModule,
    ServiceChecklistModule,
    PushModule,
    WebAuthnModule,
    TestSetupModule,
    SystemModule,
    SocialActivitiesModule,
    EmergencyModule,
  ],
})
export class AppModule {}
