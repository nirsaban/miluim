import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CompanyScopeService, CompanyScopedUser } from '../../common/services/company-scope.service';

@Injectable()
export class ShiftTemplatesService {
  constructor(
    private prisma: PrismaService,
    private companyScopeService: CompanyScopeService,
  ) {}

  async findAll(user?: CompanyScopedUser) {
    return this.prisma.shiftTemplate.findMany({
      where: { isActive: true, ...(user ? this.companyScopeService.getCompanyFilter(user) : {}) },
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
  }, user?: CompanyScopedUser) {
    return this.prisma.shiftTemplate.create({
      data: {
        ...data,
        ...(user?.companyId ? { companyId: user.companyId } : {}),
      },
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
