import { Module } from '@nestjs/common';
import { TestSetupController } from './test-setup.controller';
import { TestSetupService } from './test-setup.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TestSetupController],
  providers: [TestSetupService],
})
export class TestSetupModule {}
