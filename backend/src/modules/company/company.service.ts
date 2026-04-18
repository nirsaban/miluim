import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CompanyScopeService, CompanyScopedUser } from '../../common/services/company-scope.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CreateCompanyAdminDto } from './dto/create-company-admin.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class CompanyService {
  constructor(
    private prisma: PrismaService,
    private companyScopeService: CompanyScopeService,
  ) {}

  async create(dto: CreateCompanyDto, user: CompanyScopedUser) {
    // Resolve battalionId: use user's battalionId for BATTALION_ADMIN, or dto for SYSTEM_TECHNICAL
    const battalionId = user.role === 'BATTALION_ADMIN'
      ? user.battalionId
      : (dto.battalionId || user.battalionId);

    if (!battalionId) {
      throw new ForbiddenException('לא ניתן ליצור פלוגה ללא גדוד');
    }

    // Check for duplicate code in same battalion
    const existing = await this.prisma.company.findUnique({
      where: {
        battalionId_code: {
          battalionId,
          code: dto.code,
        },
      },
    });

    if (existing) {
      throw new ConflictException('קוד פלוגה כבר קיים בגדוד זה');
    }

    return this.prisma.company.create({
      data: {
        battalionId,
        name: dto.name,
        code: dto.code,
        description: dto.description,
      },
    });
  }

  async findAll(user: CompanyScopedUser) {
    // Battalion admin sees all companies in their battalion
    if (this.companyScopeService.isBattalionLevel(user)) {
      const where = user.battalionId
        ? { battalionId: user.battalionId, isActive: true }
        : { isActive: true };

      return this.prisma.company.findMany({
        where,
        include: {
          battalion: { select: { id: true, name: true } },
          _count: {
            select: { users: true, departments: true },
          },
        },
        orderBy: { name: 'asc' },
      });
    }

    // Company-level users see only their company
    if (!user.companyId) return [];
    return this.prisma.company.findMany({
      where: { id: user.companyId, isActive: true },
      include: {
        battalion: { select: { id: true, name: true } },
        _count: {
          select: { users: true, departments: true },
        },
      },
    });
  }

  async findOne(id: string, user: CompanyScopedUser) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        battalion: { select: { id: true, name: true } },
        departments: {
          where: { isActive: true },
          select: { id: true, name: true, code: true },
        },
        _count: {
          select: { users: true, departments: true },
        },
      },
    });

    if (!company) {
      throw new NotFoundException('פלוגה לא נמצאה');
    }

    if (!this.companyScopeService.isBattalionLevel(user)) {
      this.companyScopeService.assertCompanyAccess(user, id);
    }

    return company;
  }

  async update(id: string, dto: UpdateCompanyDto, user: CompanyScopedUser) {
    await this.findOne(id, user);
    return this.prisma.company.update({
      where: { id },
      data: dto,
    });
  }

  async createInitialAdmin(companyId: string, dto: CreateCompanyAdminDto, user: CompanyScopedUser) {
    // Verify company exists and user has access
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException('פלוגה לא נמצאה');
    }

    if (user.role === 'BATTALION_ADMIN' && user.battalionId !== company.battalionId) {
      throw new ForbiddenException('אין גישה לפלוגה זו');
    }

    // Check for duplicate personalId, email, idNumber
    const conflicts = await this.prisma.user.findFirst({
      where: {
        OR: [
          { personalId: dto.personalId },
          { email: dto.email },
          { idNumber: dto.idNumber },
        ],
      },
    });

    if (conflicts) {
      throw new ConflictException('משתמש עם פרטים זהים כבר קיים במערכת');
    }

    const passwordHash = await bcrypt.hash(dto.temporaryPassword, 10);

    return this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        personalId: dto.personalId,
        armyNumber: dto.personalId,
        idNumber: dto.idNumber,
        passwordHash,
        role: 'ADMIN',
        militaryRole: 'PLATOON_COMMANDER',
        companyId: companyId,
        isPreApproved: true,
        isRegistered: true,
        isActive: true,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        personalId: true,
        role: true,
        companyId: true,
      },
    });
  }
}
