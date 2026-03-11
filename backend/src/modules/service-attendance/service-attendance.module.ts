import { Module } from '@nestjs/common';
import { ServiceAttendanceController } from './service-attendance.controller';
import { ServiceAttendanceService } from './service-attendance.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ServiceAttendanceController],
  providers: [ServiceAttendanceService],
  exports: [ServiceAttendanceService],
})
export class ServiceAttendanceModule {}
