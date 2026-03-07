import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LeaveType, LeaveStatus } from '@prisma/client';

@Injectable()
export class LeaveRequestsService {
  constructor(private prisma: PrismaService) {}

  private readonly includeRelations = {
    soldier: {
      select: {
        id: true,
        fullName: true,
        phone: true,
        armyNumber: true,
      },
    },
    category: true,
    approvedBy: {
      select: {
        id: true,
        fullName: true,
      },
    },
  };

  async findUserRequests(userId: string) {
    return this.prisma.leaveRequest.findMany({
      where: { soldierId: userId },
      include: this.includeRelations,
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    soldierId: string,
    data: {
      type: LeaveType;
      categoryId?: string;
      reason?: string;
      exitTime: Date;
      expectedReturn: Date;
    },
  ) {
    // Validate that SHORT leave has a category
    if (data.type === 'SHORT' && !data.categoryId) {
      throw new BadRequestException('יציאה קצרה חייבת לכלול קטגוריה');
    }

    // Validate times
    const exitTime = new Date(data.exitTime);
    const expectedReturn = new Date(data.expectedReturn);

    if (expectedReturn <= exitTime) {
      throw new BadRequestException('זמן חזרה צפוי חייב להיות אחרי זמן היציאה');
    }

    // Check if soldier has an active leave request
    const activeRequest = await this.prisma.leaveRequest.findFirst({
      where: {
        soldierId,
        status: { in: ['PENDING', 'APPROVED', 'ACTIVE'] },
      },
    });

    if (activeRequest) {
      throw new BadRequestException('יש לך כבר בקשת יציאה פעילה');
    }

    return this.prisma.leaveRequest.create({
      data: {
        soldierId,
        type: data.type,
        categoryId: data.type === 'SHORT' ? data.categoryId : null,
        reason: data.reason,
        exitTime,
        expectedReturn,
      },
      include: this.includeRelations,
    });
  }

  async findPending() {
    return this.prisma.leaveRequest.findMany({
      where: { status: 'PENDING' },
      include: this.includeRelations,
      orderBy: { createdAt: 'asc' },
    });
  }

  async findActive() {
    return this.prisma.leaveRequest.findMany({
      where: { status: 'ACTIVE' },
      include: this.includeRelations,
      orderBy: { exitTime: 'asc' },
    });
  }

  async findOverdue() {
    const now = new Date();
    return this.prisma.leaveRequest.findMany({
      where: {
        status: 'ACTIVE',
        expectedReturn: { lt: now },
      },
      include: this.includeRelations,
      orderBy: { expectedReturn: 'asc' },
    });
  }

  async getDashboard() {
    const now = new Date();

    const [totalSoldiers, activeLeaves, overdueLeaves, pendingRequests] = await Promise.all([
      this.prisma.user.count({
        where: { isActive: true, role: 'SOLDIER' },
      }),
      this.prisma.leaveRequest.count({
        where: { status: 'ACTIVE' },
      }),
      this.prisma.leaveRequest.count({
        where: {
          status: 'ACTIVE',
          expectedReturn: { lt: now },
        },
      }),
      this.prisma.leaveRequest.count({
        where: { status: 'PENDING' },
      }),
    ]);

    const activeLeavesList = await this.prisma.leaveRequest.findMany({
      where: { status: 'ACTIVE' },
      include: this.includeRelations,
      orderBy: { expectedReturn: 'asc' },
    });

    const pendingList = await this.prisma.leaveRequest.findMany({
      where: { status: 'PENDING' },
      include: this.includeRelations,
      orderBy: { createdAt: 'asc' },
      take: 10,
    });

    // Get all categories for reference
    const allCategories = await this.prisma.leaveCategory.findMany({
      where: { isActive: true },
    });

    // Build category breakdown from active leaves
    const categoryBreakdown: { categoryId: string | null; categoryName: string; displayName: string; count: number; type: string }[] = [];

    // Count by category for SHORT leaves
    const shortLeaves = activeLeavesList.filter(l => l.type === 'SHORT');
    const categoryCountMap = new Map<string, number>();

    for (const leave of shortLeaves) {
      const catId = leave.categoryId || 'OTHER';
      categoryCountMap.set(catId, (categoryCountMap.get(catId) || 0) + 1);
    }

    // Add category counts
    for (const [catId, count] of categoryCountMap) {
      const category = allCategories.find(c => c.id === catId);
      categoryBreakdown.push({
        categoryId: catId === 'OTHER' ? null : catId,
        categoryName: category?.name || 'OTHER',
        displayName: category?.displayName || 'אחר',
        count,
        type: 'SHORT',
      });
    }

    // Count HOME leaves
    const homeLeaves = activeLeavesList.filter(l => l.type === 'HOME');
    if (homeLeaves.length > 0) {
      categoryBreakdown.push({
        categoryId: null,
        categoryName: 'HOME',
        displayName: 'יציאה הביתה',
        count: homeLeaves.length,
        type: 'HOME',
      });
    }

    // Sort by count descending
    categoryBreakdown.sort((a, b) => b.count - a.count);

    return {
      stats: {
        totalSoldiers,
        inBase: totalSoldiers - activeLeaves,
        outOfBase: activeLeaves,
        overdue: overdueLeaves,
        pending: pendingRequests,
      },
      categoryBreakdown,
      activeLeaves: activeLeavesList.map((leave) => ({
        ...leave,
        isOverdue: new Date(leave.expectedReturn) < now,
      })),
      pendingRequests: pendingList,
    };
  }

  async approve(id: string, adminId: string, adminNote?: string) {
    const request = await this.prisma.leaveRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('בקשה לא נמצאה');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('ניתן לאשר רק בקשות ממתינות');
    }

    // Check if exit time is now or in the past - mark as ACTIVE
    // Otherwise mark as APPROVED (will become ACTIVE when exit time arrives)
    const now = new Date();
    const exitTime = new Date(request.exitTime);
    const newStatus: LeaveStatus = exitTime <= now ? 'ACTIVE' : 'APPROVED';

    return this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status: newStatus,
        approvedById: adminId,
        adminNote,
      },
      include: this.includeRelations,
    });
  }

  async reject(id: string, adminId: string, adminNote?: string) {
    const request = await this.prisma.leaveRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('בקשה לא נמצאה');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('ניתן לדחות רק בקשות ממתינות');
    }

    return this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approvedById: adminId,
        adminNote,
      },
      include: this.includeRelations,
    });
  }

  async markActive(id: string) {
    const request = await this.prisma.leaveRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('בקשה לא נמצאה');
    }

    if (request.status !== 'APPROVED') {
      throw new BadRequestException('ניתן להפעיל רק בקשות מאושרות');
    }

    return this.prisma.leaveRequest.update({
      where: { id },
      data: { status: 'ACTIVE' },
      include: this.includeRelations,
    });
  }

  async markReturned(id: string) {
    const request = await this.prisma.leaveRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('בקשה לא נמצאה');
    }

    if (request.status !== 'ACTIVE') {
      throw new BadRequestException('ניתן לסמן חזרה רק לחיילים שבחוץ');
    }

    return this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status: 'RETURNED',
        actualReturn: new Date(),
      },
      include: this.includeRelations,
    });
  }

  async findAll(params?: {
    status?: LeaveStatus;
    type?: LeaveType;
    soldierId?: string;
  }) {
    return this.prisma.leaveRequest.findMany({
      where: {
        ...(params?.status && { status: params.status }),
        ...(params?.type && { type: params.type }),
        ...(params?.soldierId && { soldierId: params.soldierId }),
      },
      include: this.includeRelations,
      orderBy: { createdAt: 'desc' },
    });
  }

  async cancelRequest(id: string, userId: string) {
    const request = await this.prisma.leaveRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('בקשה לא נמצאה');
    }

    if (request.soldierId !== userId) {
      throw new ForbiddenException('אין לך הרשאה לבטל בקשה זו');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('ניתן לבטל רק בקשות ממתינות');
    }

    return this.prisma.leaveRequest.delete({
      where: { id },
    });
  }
}
