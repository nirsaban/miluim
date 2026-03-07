import { Controller, Get, Param, UseGuards, Patch, Put, Body } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UserRole } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get('contacts')
  findContacts() {
    return this.usersService.findContacts();
  }

  @Public()
  @Get('roles')
  getRoles() {
    return this.usersService.getRoles();
  }

  @Get('me')
  getProfile(@CurrentUser() user: any) {
    return this.usersService.findOne(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch('me')
  updateProfile(
    @CurrentUser() user: any,
    @Body() data: { phone?: string; dailyJob?: string; city?: string; fieldOfStudy?: string },
  ) {
    return this.usersService.updateProfile(user.id, data);
  }

  @Get('admin/soldiers')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  findAllSoldiersWithSkills() {
    return this.usersService.findAllSoldiersWithSkills();
  }

  @Get(':id/skills')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  getUserSkills(@Param('id') id: string) {
    return this.usersService.getUserSkills(id);
  }

  @Put(':id/skills')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  updateUserSkills(
    @Param('id') id: string,
    @Body() data: { skillIds: string[] },
  ) {
    return this.usersService.updateUserSkills(id, data.skillIds);
  }

  @Patch(':id/role')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  updateUserRole(
    @Param('id') id: string,
    @Body() data: { role: UserRole },
  ) {
    return this.usersService.updateUserRole(id, data.role);
  }
}
