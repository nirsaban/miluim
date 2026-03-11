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

@Injectable()
export class ServiceAttendanceService {
  constructor(private prisma: PrismaService) {}

  // Get current active cycle
  private async getCurrentActiveCycle() {
    const cycle = await this.prisma.reserveServiceCycle.findFirst({
      where: { status: ReserveServiceCycleStatus.ACTIVE },
    });

    if (!cycle) {
      throw new NotFoundException('אין סבב מילואים פעיל כרגע');
    }

    return cycle;
  }

  // Get my attendance for current cycle
  async getMyCurrentAttendance(userId: string) {
    const cycle = await this.getCurrentActiveCycle();

    let attendance = await this.prisma.serviceAttendance.findUnique({
      where: {
        serviceCycleId_userId: {
          serviceCycleId: cycle.id,
          userId,
        },
      },
      include: {
        serviceCycle: true,
      },
    });

    // If no attendance record exists, create one
    if (!attendance) {
      attendance = await this.prisma.serviceAttendance.create({
        data: {
          serviceCycleId: cycle.id,
          userId,
          attendanceStatus: ServiceAttendanceStatus.PENDING,
        },
        include: {
          serviceCycle: true,
        },
      });
    }

    return attendance;
  }

  // Update my attendance for current cycle (soldier self-service)
  async updateMyCurrentAttendance(
    userId: string,
    data: {
      attendanceStatus?: ServiceAttendanceStatus;
      cannotAttendReason?: string;
      onboardGunNumber?: string;
      hotelRoomNumber?: string;
      notes?: string;
    },
  ) {
    const cycle = await this.getCurrentActiveCycle();

    // Validate: if NOT_COMING, reason should be provided
    if (
      data.attendanceStatus === ServiceAttendanceStatus.NOT_COMING &&
      !data.cannotAttendReason
    ) {
      throw new BadRequestException('נא לציין סיבת אי-הגעה');
    }

    // Clear reason if status is not NOT_COMING
    if (
      data.attendanceStatus &&
      data.attendanceStatus !== ServiceAttendanceStatus.NOT_COMING
    ) {
      data.cannotAttendReason = '';
    }

    // Set checkInAt when ARRIVED
    const updateData: any = { ...data };
    if (data.attendanceStatus === ServiceAttendanceStatus.ARRIVED) {
      updateData.checkInAt = new Date();
    }

    return this.prisma.serviceAttendance.upsert({
      where: {
        serviceCycleId_userId: {
          serviceCycleId: cycle.id,
          userId,
        },
      },
      update: updateData,
      create: {
        serviceCycleId: cycle.id,
        userId,
        ...updateData,
      },
      include: {
        serviceCycle: true,
      },
    });
  }

  // Admin: Get all attendances for current cycle
  async getAllForCurrentCycle() {
    const cycle = await this.getCurrentActiveCycle();

    return this.prisma.serviceAttendance.findMany({
      where: { serviceCycleId: cycle.id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            personalId: true,
            phone: true,
            militaryRole: true,
            department: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: [
        { attendanceStatus: 'asc' },
        { user: { fullName: 'asc' } },
      ],
    });
  }

  // Admin: Get all attendances for a specific cycle
  async getAllForCycle(cycleId: string) {
    return this.prisma.serviceAttendance.findMany({
      where: { serviceCycleId: cycleId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            personalId: true,
            phone: true,
            militaryRole: true,
            department: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: [
        { attendanceStatus: 'asc' },
        { user: { fullName: 'asc' } },
      ],
    });
  }

  // Admin: Update any attendance record
  async updateAttendance(
    id: string,
    data: {
      attendanceStatus?: ServiceAttendanceStatus;
      cannotAttendReason?: string;
      onboardGunNumber?: string;
      hotelRoomNumber?: string;
      notes?: string;
      totalActiveDays?: number;
      checkInAt?: Date;
      checkOutAt?: Date;
    },
  ) {
    return this.prisma.serviceAttendance.update({
      where: { id },
      data,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            personalId: true,
          },
        },
      },
    });
  }

  // Admin: Get attendance by user ID for current cycle
  async getAttendanceByUserId(userId: string, cycleId?: string) {
    let targetCycleId = cycleId;

    if (!targetCycleId) {
      const cycle = await this.getCurrentActiveCycle();
      targetCycleId = cycle.id;
    }

    return this.prisma.serviceAttendance.findUnique({
      where: {
        serviceCycleId_userId: {
          serviceCycleId: targetCycleId,
          userId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            personalId: true,
            phone: true,
          },
        },
        serviceCycle: true,
      },
    });
  }

  // Get overall attendance statistics for charts
  async getAttendanceStats(cycleId?: string) {
    let targetCycleId = cycleId;
    let cycle = null;

    if (!targetCycleId) {
      cycle = await this.getCurrentActiveCycle();
      targetCycleId = cycle.id;
    } else {
      cycle = await this.prisma.reserveServiceCycle.findUnique({
        where: { id: targetCycleId },
      });
    }

    // Get total users in the system
    const totalUsers = await this.prisma.user.count({
      where: { isActive: true },
    });

    // Get all attendances for the cycle
    const attendances = await this.prisma.serviceAttendance.findMany({
      where: { serviceCycleId: targetCycleId },
      include: {
        user: {
          select: {
            militaryRole: true,
            department: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    // Count by status
    const statusCounts = {
      arrived: 0,
      late: 0,
      notComing: 0,
      pending: 0,
      leftEarly: 0,
    };

    const reasonCounts: Record<string, number> = {};

    attendances.forEach((a) => {
      switch (a.attendanceStatus) {
        case ServiceAttendanceStatus.ARRIVED:
          statusCounts.arrived++;
          break;
        case ServiceAttendanceStatus.LATE:
          statusCounts.late++;
          break;
        case ServiceAttendanceStatus.NOT_COMING:
          statusCounts.notComing++;
          if (a.cannotAttendReason) {
            reasonCounts[a.cannotAttendReason] = (reasonCounts[a.cannotAttendReason] || 0) + 1;
          }
          break;
        case ServiceAttendanceStatus.LEFT_EARLY:
          statusCounts.leftEarly++;
          break;
        default:
          statusCounts.pending++;
      }
    });

    // Users who haven't responded yet (no attendance record)
    const usersWithAttendance = attendances.length;
    const noResponse = totalUsers - usersWithAttendance;

    // Pie chart data
    const pieChartData = [
      { name: 'הגיעו', value: statusCounts.arrived, color: '#22c55e' },
      { name: 'איחור', value: statusCounts.late, color: '#f59e0b' },
      { name: 'לא מגיעים', value: statusCounts.notComing, color: '#ef4444' },
      { name: 'ממתינים', value: statusCounts.pending, color: '#6b7280' },
      { name: 'לא עדכנו', value: noResponse, color: '#d1d5db' },
    ].filter(item => item.value > 0);

    // Bar chart data - reasons for not coming
    const reasonsChartData = Object.entries(reasonCounts)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      cycle: cycle ? {
        id: cycle.id,
        name: cycle.name,
        startDate: cycle.startDate,
      } : null,
      summary: {
        totalUsers,
        totalResponded: usersWithAttendance,
        noResponse,
        ...statusCounts,
        totalPresent: statusCounts.arrived + statusCounts.late,
        attendanceRate: totalUsers > 0
          ? Math.round(((statusCounts.arrived + statusCounts.late) / totalUsers) * 100)
          : 0,
      },
      pieChartData,
      reasonsChartData,
    };
  }

  // Get attendance statistics grouped by department
  async getAttendanceByDepartment(cycleId?: string) {
    let targetCycleId = cycleId;

    if (!targetCycleId) {
      const cycle = await this.getCurrentActiveCycle();
      targetCycleId = cycle.id;
    }

    const attendances = await this.prisma.serviceAttendance.findMany({
      where: { serviceCycleId: targetCycleId },
      include: {
        user: {
          select: {
            department: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    // Group by department
    const byDepartment: Record<
      string,
      {
        departmentName: string;
        total: number;
        arrived: number;
        notComing: number;
        pending: number;
      }
    > = {};

    attendances.forEach((a) => {
      const deptId = a.user.department?.id || 'none';
      const deptName = a.user.department?.name || 'ללא מחלקה';

      if (!byDepartment[deptId]) {
        byDepartment[deptId] = {
          departmentName: deptName,
          total: 0,
          arrived: 0,
          notComing: 0,
          pending: 0,
        };
      }

      byDepartment[deptId].total++;

      switch (a.attendanceStatus) {
        case ServiceAttendanceStatus.ARRIVED:
        case ServiceAttendanceStatus.LATE:
          byDepartment[deptId].arrived++;
          break;
        case ServiceAttendanceStatus.NOT_COMING:
        case ServiceAttendanceStatus.LEFT_EARLY:
          byDepartment[deptId].notComing++;
          break;
        default:
          byDepartment[deptId].pending++;
      }
    });

    return Object.values(byDepartment);
  }
}
