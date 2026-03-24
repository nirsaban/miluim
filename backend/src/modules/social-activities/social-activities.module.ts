import { Module } from '@nestjs/common';
import { SocialActivitiesController } from './social-activities.controller';
import { SocialActivitiesService } from './social-activities.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { PushModule } from '../push/push.module';

@Module({
  imports: [PrismaModule, PushModule],
  controllers: [SocialActivitiesController],
  providers: [SocialActivitiesService],
  exports: [SocialActivitiesService],
})
export class SocialActivitiesModule {}
