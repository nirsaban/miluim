import { Module } from '@nestjs/common';
import { BattalionController } from './battalion.controller';
import { BattalionService } from './battalion.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BattalionController],
  providers: [BattalionService],
  exports: [BattalionService],
})
export class BattalionModule {}
