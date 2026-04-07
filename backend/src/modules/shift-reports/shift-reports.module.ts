import { Module } from '@nestjs/common';
import { ShiftReportsService } from './shift-reports.service';
import { ShiftReportsController } from './shift-reports.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ShiftReportsService],
  controllers: [ShiftReportsController],
  exports: [ShiftReportsService],
})
export class ShiftReportsModule {}
