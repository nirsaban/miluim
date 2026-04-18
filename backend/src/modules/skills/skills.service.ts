import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CompanyScopeService, CompanyScopedUser } from '../../common/services/company-scope.service';

@Injectable()
export class SkillsService {
  constructor(
    private prisma: PrismaService,
    private companyScopeService: CompanyScopeService,
  ) {}

  async findAll(user?: CompanyScopedUser) {
    return this.prisma.skill.findMany({
      where: { isActive: true, ...(user ? this.companyScopeService.getCompanyFilter(user) : {}) },
      orderBy: { displayName: 'asc' },
    });
  }

  async findAllAdmin() {
    return this.prisma.skill.findMany({
      orderBy: { displayName: 'asc' },
      include: {
        _count: {
          select: { soldiers: true, taskRequirements: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const skill = await this.prisma.skill.findUnique({
      where: { id },
      include: {
        _count: {
          select: { soldiers: true, taskRequirements: true },
        },
      },
    });

    if (!skill) {
      throw new NotFoundException('כישור לא נמצא');
    }

    return skill;
  }

  async create(data: { name: string; displayName: string }, user?: CompanyScopedUser) {
    const existing = await this.prisma.skill.findFirst({
      where: { name: data.name },
    });

    if (existing) {
      throw new ConflictException('כישור עם שם זה כבר קיים');
    }

    return this.prisma.skill.create({
      data: {
        name: data.name.toUpperCase(),
        displayName: data.displayName,
        ...(user?.companyId ? { companyId: user.companyId } : {}),
      },
    });
  }

  async update(id: string, data: { name?: string; displayName?: string; isActive?: boolean }) {
    const skill = await this.prisma.skill.findUnique({ where: { id } });

    if (!skill) {
      throw new NotFoundException('כישור לא נמצא');
    }

    if (data.name && data.name !== skill.name) {
      const existing = await this.prisma.skill.findFirst({
        where: { name: data.name },
      });
      if (existing) {
        throw new ConflictException('כישור עם שם זה כבר קיים');
      }
    }

    return this.prisma.skill.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name.toUpperCase() }),
        ...(data.displayName && { displayName: data.displayName }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  async delete(id: string) {
    const skill = await this.prisma.skill.findUnique({ where: { id } });

    if (!skill) {
      throw new NotFoundException('כישור לא נמצא');
    }

    // Soft delete
    return this.prisma.skill.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
