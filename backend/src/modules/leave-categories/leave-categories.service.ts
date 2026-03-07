import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LeaveCategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.leaveCategory.findMany({
      where: { isActive: true },
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

  async create(data: { name: string; displayName: string; icon?: string }) {
    const existing = await this.prisma.leaveCategory.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      throw new ConflictException('קטגוריה עם שם זה כבר קיימת');
    }

    return this.prisma.leaveCategory.create({
      data,
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
