import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CompanyScopeService, CompanyScopedUser } from '../../common/services/company-scope.service';

@Injectable()
export class LeaveCategoriesService {
  constructor(
    private prisma: PrismaService,
    private companyScopeService: CompanyScopeService,
  ) {}

  async findAll(user?: CompanyScopedUser) {
    return this.prisma.leaveCategory.findMany({
      where: { isActive: true, ...(user ? this.companyScopeService.getCompanyFilter(user) : {}) },
      orderBy: { displayName: 'asc' },
    });
  }

  async findAllAdmin() {
    return this.prisma.leaveCategory.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.leaveCategory.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('קטגוריה לא נמצאה');
    }

    return category;
  }

  async create(data: { name: string; displayName: string; icon?: string }, user?: CompanyScopedUser) {
    const existing = await this.prisma.leaveCategory.findFirst({
      where: { name: data.name },
    });

    if (existing) {
      throw new ConflictException('קטגוריה עם שם זה כבר קיימת');
    }

    return this.prisma.leaveCategory.create({
      data: {
        ...data,
        ...(user?.companyId ? { companyId: user.companyId } : {}),
      },
    });
  }

  async update(id: string, data: { name?: string; displayName?: string; icon?: string; isActive?: boolean }) {
    await this.findOne(id);

    if (data.name) {
      const existing = await this.prisma.leaveCategory.findFirst({
        where: { name: data.name, id: { not: id } },
      });

      if (existing) {
        throw new ConflictException('קטגוריה עם שם זה כבר קיימת');
      }
    }

    return this.prisma.leaveCategory.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    await this.findOne(id);

    // Soft delete - just mark as inactive
    return this.prisma.leaveCategory.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
