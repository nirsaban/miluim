import { Module } from '@nestjs/common';
import { ShiftAssignmentsService } from './shift-assignments.service';
import { ShiftAssignmentsController } from './shift-assignments.controller';
import { ValidationService } from './validation.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ShiftAssignmentsController],
  providers: [ShiftAssignmentsService, ValidationService],
  exports: [ShiftAssignmentsService, ValidationService],
})
export class ShiftAssignmentsModule {}
