import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SoldierStatusType } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    const [
      totalUsers,
      activeUsers,
      pendingForms,
      recentNotifications,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.formSubmission.count({ where: { status: 'PENDING' } }),
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

  async getAllUsersWithStatus() {
    return this.prisma.user.findMany({
      where: { isActive: true },
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
