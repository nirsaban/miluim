import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CompanyScopeService, CompanyScopedUser } from '../../common/services/company-scope.service';

@Injectable()
export class ZonesService {
  constructor(
    private prisma: PrismaService,
    private companyScopeService: CompanyScopeService,
  ) {}

  async findAll(user?: CompanyScopedUser) {
    return this.prisma.zone.findMany({
      where: { isActive: true, ...(user ? this.companyScopeService.getCompanyFilter(user) : {}) },
      orderBy: { name: 'asc' },
    });
  }

  async findAllAdmin() {
    return this.prisma.zone.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const zone = await this.prisma.zone.findUnique({
      where: { id },
      include: {
        tasks: {
          where: { isActive: true },
          include: {
            requirements: {
              include: { skill: true },
            },
          },
        },
      },
    });

    if (!zone) {
      throw new NotFoundException('אזור לא נמצא');
    }

    return zone;
  }

  async create(data: { name: string; description?: string }, user?: CompanyScopedUser) {
    const existing = await this.prisma.zone.findFirst({
      where: { name: data.name },
    });

    if (existing) {
      throw new ConflictException('אזור עם שם זה כבר קיים');
    }

    return this.prisma.zone.create({
      data: {
        name: data.name,
        description: data.description,
        ...(user?.companyId ? { companyId: user.companyId } : {}),
      },
    });
  }

  async update(id: string, data: { name?: string; description?: string; isActive?: boolean }) {
    const zone = await this.prisma.zone.findUnique({ where: { id } });

    if (!zone) {
      throw new NotFoundException('אזור לא נמצא');
    }

    if (data.name && data.name !== zone.name) {
      const existing = await this.prisma.zone.findFirst({
        where: { name: data.name },
      });
      if (existing) {
        throw new ConflictException('אזור עם שם זה כבר קיים');
      }
    }

    return this.prisma.zone.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  async delete(id: string) {
    const zone = await this.prisma.zone.findUnique({ where: { id } });

    if (!zone) {
      throw new NotFoundException('אזור לא נמצא');
    }

    // Soft delete
    return this.prisma.zone.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
