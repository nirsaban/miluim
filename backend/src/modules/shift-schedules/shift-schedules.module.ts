import { Module } from '@nestjs/common';
import { ShiftSchedulesService } from './shift-schedules.service';
import { ShiftSchedulesController } from './shift-schedules.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ShiftSchedulesController],
  providers: [ShiftSchedulesService],
  exports: [ShiftSchedulesService],
})
export class ShiftSchedulesModule {}
