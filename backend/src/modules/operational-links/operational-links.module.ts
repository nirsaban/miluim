import { Module } from '@nestjs/common';
import { OperationalLinksController } from './operational-links.controller';
import { OperationalLinksService } from './operational-links.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [OperationalLinksController],
  providers: [OperationalLinksService],
  exports: [OperationalLinksService],
})
export class OperationalLinksModule {}
