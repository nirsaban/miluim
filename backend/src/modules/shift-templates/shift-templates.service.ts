import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ShiftTemplatesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.shiftTemplate.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findAllAdmin() {
    return this.prisma.shiftTemplate.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findOne(id: string) {
    const template = await this.prisma.shiftTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException('Shift template not found');
    }

    return template;
  }

  async create(data: {
    name: string;
    displayName: string;
    startTime: string;
    endTime: string;
    color?: string;
    sortOrder?: number;
  }) {
    return this.prisma.shiftTemplate.create({
      data,
    });
  }

  async update(
    id: string,
    data: {
      name?: string;
      displayName?: string;
      startTime?: string;
      endTime?: string;
      color?: string;
      sortOrder?: number;
      isActive?: boolean;
    },
  ) {
    await this.findOne(id);
    return this.prisma.shiftTemplate.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.shiftTemplate.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
