import { Module } from '@nestjs/common';
import { ServiceCyclesController } from './service-cycles.controller';
import { ServiceCyclesService } from './service-cycles.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ServiceCyclesController],
  providers: [ServiceCyclesService],
  exports: [ServiceCyclesService],
})
export class ServiceCyclesModule {}
