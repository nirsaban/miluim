import { Module } from '@nestjs/common';
import { BattalionDashboardController } from './battalion-dashboard.controller';
import { BattalionDashboardService } from './battalion-dashboard.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BattalionDashboardController],
  providers: [BattalionDashboardService],
})
export class BattalionDashboardModule {}
