import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { CompanyService } from './company.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CreateCompanyAdminDto } from './dto/create-company-admin.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('companies')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post()
  @Roles(UserRole.BATTALION_ADMIN, UserRole.SYSTEM_TECHNICAL)
  create(@Body() dto: CreateCompanyDto, @CurrentUser() user: any) {
    return this.companyService.create(dto, user);
  }

  @Get()
  @Roles(UserRole.BATTALION_ADMIN, UserRole.ADMIN, UserRole.SYSTEM_TECHNICAL)
  findAll(@CurrentUser() user: any) {
    return this.companyService.findAll(user);
  }

  @Get(':id')
  @Roles(UserRole.BATTALION_ADMIN, UserRole.ADMIN, UserRole.SYSTEM_TECHNICAL)
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.companyService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.BATTALION_ADMIN, UserRole.SYSTEM_TECHNICAL)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCompanyDto,
    @CurrentUser() user: any,
  ) {
    return this.companyService.update(id, dto, user);
  }

  @Post(':id/initial-admin')
  @Roles(UserRole.BATTALION_ADMIN, UserRole.SYSTEM_TECHNICAL)
  createInitialAdmin(
    @Param('id') companyId: string,
    @Body() dto: CreateCompanyAdminDto,
    @CurrentUser() user: any,
  ) {
    return this.companyService.createInitialAdmin(companyId, dto, user);
  }
}
