import { Controller, Post, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TestSetupService } from './test-setup.service';

@Controller('test-setup')
@UseGuards(JwtAuthGuard)
export class TestSetupController {
  constructor(private readonly testSetupService: TestSetupService) {}

  @Post('run')
  runTestSetup(@Request() req: any) {
    return this.testSetupService.runTestSetup(req.user.personalId);
  }

  @Post('rollback')
  rollbackTestData(@Request() req: any) {
    return this.testSetupService.rollbackTestData(req.user.personalId);
  }
}
