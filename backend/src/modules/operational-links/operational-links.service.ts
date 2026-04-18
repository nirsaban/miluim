import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CompanyScopeService, CompanyScopedUser } from '../../common/services/company-scope.service';

@Injectable()
export class OperationalLinksService {
  constructor(
    private prisma: PrismaService,
    private companyScopeService: CompanyScopeService,
  ) {}

  async findAll(user?: CompanyScopedUser) {
    return this.prisma.operationalLink.findMany({
      where: {
        isActive: true,
        ...(user ? this.companyScopeService.getCompanyFilter(user) : {}),
      },
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const link = await this.prisma.operationalLink.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    if (!link) {
      throw new NotFoundException('קישור לא נמצא');
    }

    return link;
  }

  async create(data: {
    title: string;
    description?: string;
    url: string;
    createdById: string;
  }, user?: CompanyScopedUser) {
    return this.prisma.operationalLink.create({
      data: {
        title: data.title,
        description: data.description,
        url: data.url,
        createdById: data.createdById,
        ...(user?.companyId ? { companyId: user.companyId } : {}),
      },
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });
  }

  async update(
    id: string,
    data: Partial<{
      title: string;
      description: string;
      url: string;
      isActive: boolean;
    }>,
  ) {
    const link = await this.prisma.operationalLink.findUnique({
      where: { id },
    });

    if (!link) {
      throw new NotFoundException('קישור לא נמצא');
    }

    return this.prisma.operationalLink.update({
      where: { id },
      data,
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });
  }

  async delete(id: string) {
    const link = await this.prisma.operationalLink.findUnique({
      where: { id },
    });

    if (!link) {
      throw new NotFoundException('קישור לא נמצא');
    }

    return this.prisma.operationalLink.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
