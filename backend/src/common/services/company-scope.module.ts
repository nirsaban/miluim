import { Global, Module } from '@nestjs/common';
import { CompanyScopeService } from './company-scope.service';

@Global()
@Module({
  providers: [CompanyScopeService],
  exports: [CompanyScopeService],
})
export class CompanyScopeModule {}
