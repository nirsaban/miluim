import { Controller, Get, Post, Delete, Param, UseGuards, Patch, Put, Body } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UserRole, MilitaryRole } from '@prisma/client';
import { CreatePreapprovedUserDto } from './dto';

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

  @Public()
  @Get('departments/list')
  getPublicDepartments() {
    return this.usersService.getDepartments();
  }

  @Get('me')
  getProfile(@CurrentUser() user: any) {
    return this.usersService.findOne(user.id);
  }

  @Get('me/home')
  getHomeData(@CurrentUser() user: any) {
    return this.usersService.getHomeData(user.id);
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

  // ADMIN only: manage all soldiers
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

  @Patch(':id/military-role')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  updateMilitaryRole(
    @Param('id') id: string,
    @Body() data: { militaryRole: MilitaryRole },
  ) {
    return this.usersService.updateMilitaryRole(id, data.militaryRole);
  }

  @Patch(':id/department')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  updateDepartment(
    @Param('id') id: string,
    @Body() data: { departmentId: string },
  ) {
    return this.usersService.updateDepartment(id, data.departmentId);
  }

  // Pre-approved users management

  @Get('admin/preapproved')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  findAllPreapprovedUsers() {
    return this.usersService.findAllPreapprovedUsers();
  }

  @Post('admin/preapproved')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  createPreapprovedUser(@Body() dto: CreatePreapprovedUserDto) {
    return this.usersService.createPreapprovedUser(dto);
  }

  @Delete('admin/preapproved/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  deletePreapprovedUser(@Param('id') id: string) {
    return this.usersService.deletePreapprovedUser(id);
  }

  @Get('admin/departments')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  getDepartments() {
    return this.usersService.getDepartments();
  }

  // Department view endpoints for OFFICER role
  @Get('department/my-soldiers')
  @UseGuards(RolesGuard)
  @Roles('OFFICER')
  getDepartmentSoldiers(@CurrentUser() user: any) {
    return this.usersService.getDepartmentSoldiers(user.id);
  }

  @Get('department/analytics')
  @UseGuards(RolesGuard)
  @Roles('OFFICER')
  getDepartmentAnalytics(@CurrentUser() user: any) {
    return this.usersService.getDepartmentAnalytics(user.id);
  }

  @Get('department/soldiers-with-status')
  @UseGuards(RolesGuard)
  @Roles('OFFICER')
  getDepartmentSoldiersWithStatus(@CurrentUser() user: any) {
    return this.usersService.getDepartmentSoldiersWithStatus(user.id);
  }
}
