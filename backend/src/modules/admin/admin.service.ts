import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SoldierStatusType } from '@prisma/client';
import { CompanyScopeService, CompanyScopedUser } from '../../common/services/company-scope.service';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private companyScopeService: CompanyScopeService,
  ) {}

  async getDashboardStats(user?: CompanyScopedUser) {
    const companyFilter = user ? this.companyScopeService.getCompanyFilter(user) : {};
    const [
      totalUsers,
      activeUsers,
      pendingForms,
      recentNotifications,
    ] = await Promise.all([
      this.prisma.user.count({ where: { ...companyFilter } as any }),
      this.prisma.user.count({ where: { isActive: true, ...companyFilter } as any }),
      this.prisma.formSubmission.count({ where: { status: 'PENDING', ...companyFilter } as any }),
      this.prisma.notification.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    return {
      totalUsers,
      activeUsers,
      pendingForms,
      recentNotifications,
    };
  }

  async getSoldierStatuses() {
    return this.prisma.soldierStatus.findMany({
      include: {
        soldier: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            armyNumber: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async updateSoldierStatus(
    soldierId: string,
    status: SoldierStatusType,
    note?: string,
  ) {
    return this.prisma.soldierStatus.upsert({
      where: { soldierId },
      update: { status, note },
      create: { soldierId, status, note },
      include: {
        soldier: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });
  }

  async getAllUsersWithStatus(user?: CompanyScopedUser) {
    return this.prisma.user.findMany({
      where: {
        isActive: true,
        ...(user ? this.companyScopeService.getCompanyFilter(user) : {}),
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        armyNumber: true,
        role: true,
        soldierStatus: true,
      },
      orderBy: { fullName: 'asc' },
    });
  }
}
