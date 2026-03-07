import { Module } from '@nestjs/common';
import { LeaveCategoriesController } from './leave-categories.controller';
import { LeaveCategoriesService } from './leave-categories.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LeaveCategoriesController],
  providers: [LeaveCategoriesService],
  exports: [LeaveCategoriesService],
})
export class LeaveCategoriesModule {}
