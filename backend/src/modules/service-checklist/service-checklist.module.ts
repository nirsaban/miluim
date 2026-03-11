import { Module } from '@nestjs/common';
import { ServiceChecklistController } from './service-checklist.controller';
import { ServiceChecklistService } from './service-checklist.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ServiceChecklistController],
  providers: [ServiceChecklistService],
  exports: [ServiceChecklistService],
})
export class ServiceChecklistModule {}
