import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LeaveType, LeaveStatus, ReserveServiceCycleStatus, ServiceAttendanceStatus, UserRole, MilitaryRole } from '@prisma/client';
import { isDutyOfficer, isAdminMilitaryRole } from '../../common/constants/permissions';
import { PushService } from '../push/push.service';

@Injectable()
export class LeaveRequestsService {
  private readonly logger = new Logger(LeaveRequestsService.name);

  constructor(
    private prisma: PrismaService,
    private pushService: PushService,
  ) {}

  private readonly includeRelations = {
    soldier: {
      select: {
        id: true,
        fullName: true,
        phone: true,
        armyNumber: true,
        departmentId: true,
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

  // Get department soldiers for OFFICER/DUTY_OFFICER filtering
  private async getDepartmentSoldierIds(
    userId: string,
    userRole: UserRole,
    militaryRole?: MilitaryRole
  ): Promise<string[] | null> {
    // ADMIN role sees all - return null to skip filtering
    if (userRole === 'ADMIN') {
      return null;
    }

    // Admin-level military roles (PLATOON_COMMANDER, SERGEANT_MAJOR, OPERATIONS_SGT) see all
    if (militaryRole && isAdminMilitaryRole(militaryRole)) {
      return null;
    }

    // DUTY_OFFICER must have a department and is strictly scoped to it
    if (militaryRole && isDutyOfficer(militaryRole)) {
      const officer = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { departmentId: true },
      });

      if (!officer?.departmentId) {
        throw new ForbiddenException('מ"מ חייב להיות משויך למחלקה');
      }

      const departmentSoldiers = await this.prisma.user.findMany({
        where: { departmentId: officer.departmentId, isActive: true },
        select: { id: true },
      });

      return departmentSoldiers.map(s => s.id);
    }

    // For other OFFICER users (non-DUTY_OFFICER), get their department soldiers
    if (userRole === 'OFFICER') {
      const officer = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { departmentId: true },
      });

      if (!officer?.departmentId) {
        return []; // No department = no soldiers to see
      }

      const departmentSoldiers = await this.prisma.user.findMany({
        where: { departmentId: officer.departmentId, isActive: true },
        select: { id: true },
      });

      return departmentSoldiers.map(s => s.id);
    }

    // LOGISTICS users don't manage leave requests - return empty
    if (userRole === 'LOGISTICS') {
      return [];
    }

    return []; // Default: no soldiers to see
  }

  // Get current active service cycle (if any)
  private async getCurrentActiveCycle() {
    return this.prisma.reserveServiceCycle.findFirst({
      where: { status: ReserveServiceCycleStatus.ACTIVE },
    });
  }

  // Get users who arrived to the current service cycle
  private async getArrivedSoldiersForCurrentCycle() {
    const cycle = await this.getCurrentActiveCycle();

    if (!cycle) {
      // No active cycle - fallback to all active soldiers
      return this.prisma.user.findMany({
        where: { isActive: true, role: 'SOLDIER' },
        select: { id: true },
      });
    }

    // Get soldiers who arrived to the current cycle
    const arrivedAttendances = await this.prisma.serviceAttendance.findMany({
      where: {
        serviceCycleId: cycle.id,
        attendanceStatus: {
          in: [ServiceAttendanceStatus.ARRIVED, ServiceAttendanceStatus.LATE],
        },
      },
      select: { userId: true },
    });

    return arrivedAttendances.map(a => ({ id: a.userId }));
  }

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

    // Allow multiple requests - removed single active request restriction

    const leaveRequest = await this.prisma.leaveRequest.create({
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

    // Send push notification to officers from the soldier's department and all admins
    this.notifyOfficersOfNewRequest(leaveRequest).catch((err) => {
      this.logger.error('Failed to send push notifications for leave request', err);
    });

    return leaveRequest;
  }

  /**
   * Send push notification to officers from the soldier's department and all admins
   */
  private async notifyOfficersOfNewRequest(leaveRequest: {
    id: string;
    type: LeaveType;
    soldier: { fullName: string; departmentId: string | null };
  }) {
    const departmentId = leaveRequest.soldier.departmentId;

    // Find officers from the same department + all admins
    const usersToNotify = await this.prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          // Officers from the same department
          {
            role: 'OFFICER',
            departmentId: departmentId,
          },
          // All admins
          {
            role: 'ADMIN',
          },
          // Users with admin-level military roles (PLATOON_COMMANDER, SERGEANT_MAJOR, OPERATIONS_SGT)
          {
            militaryRole: {
              in: ['PLATOON_COMMANDER', 'SERGEANT_MAJOR', 'OPERATIONS_SGT'],
            },
          },
        ],
      },
      select: { id: true },
    });

    if (usersToNotify.length === 0) {
      this.logger.log('No officers or admins to notify for leave request');
      return;
    }

    const leaveTypeName = leaveRequest.type === 'SHORT' ? 'יציאה קצרה' : 'יציאה הביתה';
    const payload = {
      title: 'בקשת יציאה חדשה',
      body: `${leaveRequest.soldier.fullName} הגיש בקשת ${leaveTypeName}`,
      url: '/admin/status',
      tag: `leave-request-${leaveRequest.id}`,
    };

    // Send push to all relevant users
    const results = await Promise.allSettled(
      usersToNotify.map((user) => this.pushService.sendToUser(user.id, payload)),
    );

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    this.logger.log(`Leave request push notifications: sent=${sent}, failed=${failed}`);
  }

  async findPending(userId: string, userRole: UserRole, militaryRole?: MilitaryRole) {
    const soldierIds = await this.getDepartmentSoldierIds(userId, userRole, militaryRole);

    return this.prisma.leaveRequest.findMany({
      where: {
        status: 'PENDING',
        ...(soldierIds !== null && { soldierId: { in: soldierIds } }),
      },
      include: this.includeRelations,
      orderBy: { createdAt: 'asc' },
    });
  }

  async findActive(userId: string, userRole: UserRole, militaryRole?: MilitaryRole) {
    const soldierIds = await this.getDepartmentSoldierIds(userId, userRole, militaryRole);

    return this.prisma.leaveRequest.findMany({
      where: {
        status: 'ACTIVE',
        ...(soldierIds !== null && { soldierId: { in: soldierIds } }),
      },
      include: this.includeRelations,
      orderBy: { exitTime: 'asc' },
    });
  }

  async findOverdue(userId: string, userRole: UserRole, militaryRole?: MilitaryRole) {
    const soldierIds = await this.getDepartmentSoldierIds(userId, userRole, militaryRole);
    const now = new Date();

    return this.prisma.leaveRequest.findMany({
      where: {
        status: 'ACTIVE',
        expectedReturn: { lt: now },
        ...(soldierIds !== null && { soldierId: { in: soldierIds } }),
      },
      include: this.includeRelations,
      orderBy: { expectedReturn: 'asc' },
    });
  }

  async getDashboard(userId: string, userRole: UserRole, militaryRole?: MilitaryRole) {
    const now = new Date();

    // Get department soldier IDs for OFFICER/DUTY_OFFICER filtering
    const departmentSoldierIds = await this.getDepartmentSoldierIds(userId, userRole, militaryRole);

    // Get current active cycle and arrived soldiers
    const cycle = await this.getCurrentActiveCycle();
    const arrivedSoldiers = await this.getArrivedSoldiersForCurrentCycle();
    let arrivedSoldierIds = arrivedSoldiers.map(s => s.id);

    // Filter by department if OFFICER
    if (departmentSoldierIds !== null) {
      arrivedSoldierIds = arrivedSoldierIds.filter(id => departmentSoldierIds.includes(id));
    }

    // Count active leaves ONLY for arrived soldiers (filtered by department for OFFICER)
    const [activeLeavesForArrived, overdueLeaves, pendingRequests] = await Promise.all([
      this.prisma.leaveRequest.count({
        where: {
          status: 'ACTIVE',
          soldierId: { in: arrivedSoldierIds },
        },
      }),
      this.prisma.leaveRequest.count({
        where: {
          status: 'ACTIVE',
          soldierId: { in: arrivedSoldierIds },
          expectedReturn: { lt: now },
        },
      }),
      this.prisma.leaveRequest.count({
        where: {
          status: 'PENDING',
          soldierId: { in: arrivedSoldierIds },
        },
      }),
    ]);

    // Get active leaves list for arrived soldiers only
    const activeLeavesList = await this.prisma.leaveRequest.findMany({
      where: {
        status: 'ACTIVE',
        soldierId: { in: arrivedSoldierIds },
      },
      include: this.includeRelations,
      orderBy: { expectedReturn: 'asc' },
    });

    // Get pending requests for arrived soldiers only
    const pendingList = await this.prisma.leaveRequest.findMany({
      where: {
        status: 'PENDING',
        soldierId: { in: arrivedSoldierIds },
      },
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

    const totalSoldiers = arrivedSoldierIds.length;

    return {
      stats: {
        totalSoldiers,
        inBase: totalSoldiers - activeLeavesForArrived,
        outOfBase: activeLeavesForArrived,
        overdue: overdueLeaves,
        pending: pendingRequests,
      },
      categoryBreakdown,
      activeLeaves: activeLeavesList.map((leave) => ({
        ...leave,
        isOverdue: new Date(leave.expectedReturn) < now,
      })),
      pendingRequests: pendingList,
      currentCycle: cycle ? {
        id: cycle.id,
        name: cycle.name,
        startDate: cycle.startDate,
      } : null,
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

  // Allow soldier to confirm their own return from leave
  async confirmSoldierReturn(id: string, soldierId: string) {
    const request = await this.prisma.leaveRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('בקשה לא נמצאה');
    }

    // Verify the leave request belongs to this soldier
    if (request.soldierId !== soldierId) {
      throw new ForbiddenException('אין לך הרשאה לעדכן בקשה זו');
    }

    // Only allow confirming return for APPROVED or ACTIVE leave requests
    if (!['APPROVED', 'ACTIVE'].includes(request.status)) {
      throw new BadRequestException('ניתן לאשר חזרה רק ליציאות מאושרות או פעילות');
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

  async findAll(
    params: {
      status?: LeaveStatus;
      type?: LeaveType;
      soldierId?: string;
    } | undefined,
    userId: string,
    userRole: UserRole,
    militaryRole?: MilitaryRole,
  ) {
    const soldierIds = await this.getDepartmentSoldierIds(userId, userRole, militaryRole);

    return this.prisma.leaveRequest.findMany({
      where: {
        ...(params?.status && { status: params.status }),
        ...(params?.type && { type: params.type }),
        ...(params?.soldierId && { soldierId: params.soldierId }),
        ...(soldierIds !== null && { soldierId: { in: soldierIds } }),
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
