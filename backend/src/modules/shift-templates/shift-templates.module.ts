import { Module } from '@nestjs/common';
import { ShiftTemplatesService } from './shift-templates.service';
import { ShiftTemplatesController } from './shift-templates.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ShiftTemplatesController],
  providers: [ShiftTemplatesService],
  exports: [ShiftTemplatesService],
})
export class ShiftTemplatesModule {}
