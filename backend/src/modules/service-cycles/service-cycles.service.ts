import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ReserveServiceCycleStatus,
  ServiceAttendanceStatus,
} from '@prisma/client';
import { CompanyScopeService, CompanyScopedUser } from '../../common/services/company-scope.service';

@Injectable()
export class ServiceCyclesService {
  constructor(
    private prisma: PrismaService,
    private companyScopeService: CompanyScopeService,
  ) {}

  // Get all service cycles
  async findAll(user?: CompanyScopedUser) {
    return this.prisma.reserveServiceCycle.findMany({
      where: {
        ...(user ? this.companyScopeService.getCompanyFilter(user) : {}),
      },
      include: {
        createdBy: {
          select: { id: true, fullName: true },
        },
        _count: {
          select: {
            attendances: true,
            adminChecklists: true,
          },
        },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  // Get current active service cycle
  async findCurrentActive(user?: CompanyScopedUser) {
    const cycle = await this.prisma.reserveServiceCycle.findFirst({
      where: { status: ReserveServiceCycleStatus.ACTIVE, ...(user ? this.companyScopeService.getCompanyFilter(user) : {}) },
      include: {
        createdBy: {
          select: { id: true, fullName: true },
        },
        _count: {
          select: {
            attendances: true,
            adminChecklists: true,
          },
        },
      },
      orderBy: { startDate: 'desc' },
    });

    return cycle;
  }

  // Get service cycle by ID
  async findById(id: string) {
    const cycle = await this.prisma.reserveServiceCycle.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, fullName: true },
        },
        _count: {
          select: {
            attendances: true,
            adminChecklists: true,
          },
        },
      },
    });

    if (!cycle) {
      throw new NotFoundException('סבב מילואים לא נמצא');
    }

    return cycle;
  }

  // Create a new service cycle
  async create(
    userId: string,
    data: {
      name: string;
      description?: string;
      startDate: Date;
      endDate?: Date;
      location?: string;
      locationLat?: number;
      locationLng?: number;
      status?: ReserveServiceCycleStatus;
    },
    user?: CompanyScopedUser,
  ) {
    // Check if another active cycle exists when trying to create an ACTIVE one
    if (data.status === ReserveServiceCycleStatus.ACTIVE) {
      const existingActive = await this.prisma.reserveServiceCycle.findFirst({
        where: { status: ReserveServiceCycleStatus.ACTIVE },
      });

      if (existingActive) {
        throw new BadRequestException(
          'קיים כבר סבב מילואים פעיל. יש לסגור אותו לפני יצירת סבב חדש',
        );
      }
    }

    return this.prisma.reserveServiceCycle.create({
      data: {
        ...data,
        createdById: userId,
        ...(user?.companyId ? { companyId: user.companyId } : {}),
      },
      include: {
        createdBy: {
          select: { id: true, fullName: true },
        },
      },
    });
  }

  // Update a service cycle
  async update(
    id: string,
    data: {
      name?: string;
      description?: string;
      startDate?: Date;
      endDate?: Date;
      location?: string;
      locationLat?: number;
      locationLng?: number;
      status?: ReserveServiceCycleStatus;
    },
  ) {
    // Check for existing active cycle when trying to activate
    if (data.status === ReserveServiceCycleStatus.ACTIVE) {
      const existingActive = await this.prisma.reserveServiceCycle.findFirst({
        where: {
          status: ReserveServiceCycleStatus.ACTIVE,
          NOT: { id },
        },
      });

      if (existingActive) {
        throw new BadRequestException(
          'קיים כבר סבב מילואים פעיל. יש לסגור אותו לפני הפעלת סבב אחר',
        );
      }
    }

    return this.prisma.reserveServiceCycle.update({
      where: { id },
      data,
      include: {
        createdBy: {
          select: { id: true, fullName: true },
        },
      },
    });
  }

  // Delete a service cycle
  async delete(id: string) {
    return this.prisma.reserveServiceCycle.delete({
      where: { id },
    });
  }

  // Get dashboard summary for current active cycle
  async getCurrentCycleSummary(user?: CompanyScopedUser) {
    const currentCycle = await this.findCurrentActive(user);

    if (!currentCycle) {
      return null;
    }

    // Get all active/registered users count (scoped to company)
    const companyFilter = user ? this.companyScopeService.getCompanyFilter(user) : {};
    const totalSoldiers = await this.prisma.user.count({
      where: { isActive: true, isRegistered: true, ...companyFilter },
    });

    // Get attendance statistics
    const attendanceStats = await this.prisma.serviceAttendance.groupBy({
      by: ['attendanceStatus'],
      where: { serviceCycleId: currentCycle.id },
      _count: true,
    });

    // Get reasons for not coming
    const notComingReasons = await this.prisma.serviceAttendance.findMany({
      where: {
        serviceCycleId: currentCycle.id,
        attendanceStatus: ServiceAttendanceStatus.NOT_COMING,
        cannotAttendReason: { not: null },
      },
      select: {
        cannotAttendReason: true,
      },
    });

    // Group reasons by text
    const reasonsGrouped: Record<string, number> = {};
    notComingReasons.forEach((r) => {
      const reason = r.cannotAttendReason || 'לא צוינה סיבה';
      reasonsGrouped[reason] = (reasonsGrouped[reason] || 0) + 1;
    });

    // Count onboarding completion
    const onboardingStats = await this.prisma.serviceAttendance.aggregate({
      where: { serviceCycleId: currentCycle.id },
      _count: {
        onboardGunNumber: true,
        hotelRoomNumber: true,
      },
    });

    // Checklist completion
    const checklistStats = await this.prisma.serviceAdminChecklist.groupBy({
      by: ['isCompleted'],
      where: { serviceCycleId: currentCycle.id },
      _count: true,
    });

    // Build response
    const statusCounts: Record<string, number> = {
      PENDING: 0,
      ARRIVED: 0,
      NOT_COMING: 0,
      LATE: 0,
      LEFT_EARLY: 0,
    };

    attendanceStats.forEach((stat) => {
      statusCounts[stat.attendanceStatus] = stat._count;
    });

    const totalResponded = Object.values(statusCounts).reduce(
      (a, b) => a + b,
      0,
    );

    return {
      cycle: currentCycle,
      stats: {
        totalSoldiers,
        totalResponded,
        pending: statusCounts.PENDING,
        arrived: statusCounts.ARRIVED,
        notComing: statusCounts.NOT_COMING,
        late: statusCounts.LATE,
        leftEarly: statusCounts.LEFT_EARLY,
        withGunAssigned: onboardingStats._count.onboardGunNumber,
        withRoomAssigned: onboardingStats._count.hotelRoomNumber,
      },
      reasonsGrouped,
      checklistStats: {
        total:
          checklistStats.reduce((acc, curr) => acc + curr._count, 0) || 0,
        completed:
          checklistStats.find((s) => s.isCompleted)?._count || 0,
      },
    };
  }

  // Initialize attendance records for all active users when cycle is activated
  async initializeAttendanceRecords(cycleId: string, user?: CompanyScopedUser) {
    const companyFilter = user ? this.companyScopeService.getCompanyFilter(user) : {};
    const activeUsers = await this.prisma.user.findMany({
      where: { isActive: true, isRegistered: true, ...companyFilter },
      select: { id: true },
    });

    const existingAttendances = await this.prisma.serviceAttendance.findMany({
      where: { serviceCycleId: cycleId },
      select: { userId: true },
    });

    const existingUserIds = new Set(existingAttendances.map((a) => a.userId));

    const newRecords = activeUsers
      .filter((u) => !existingUserIds.has(u.id))
      .map((u) => ({
        serviceCycleId: cycleId,
        userId: u.id,
        attendanceStatus: ServiceAttendanceStatus.PENDING,
      }));

    if (newRecords.length > 0) {
      await this.prisma.serviceAttendance.createMany({
        data: newRecords,
        skipDuplicates: true,
      });
    }

    return { created: newRecords.length };
  }
}
