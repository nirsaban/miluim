import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CompanyScopedUser } from '../../common/services/company-scope.service';

@Injectable()
export class BattalionDashboardService {
  constructor(private prisma: PrismaService) {}

  /**
   * High-level overview: company count, total users, active service cycles
   */
  async getOverview(user: CompanyScopedUser) {
    const battalionId = user.battalionId;
    const companyFilter = battalionId ? { battalionId } : {};

    const [companies, totalUsers, activeServices, pendingLeaves] =
      await Promise.all([
        this.prisma.company.findMany({
          where: { ...companyFilter, isActive: true },
          select: {
            id: true,
            name: true,
            code: true,
            _count: {
              select: { users: true },
            },
          },
        }),
        this.prisma.user.count({
          where: {
            isActive: true,
            company: companyFilter.battalionId
              ? { battalionId: companyFilter.battalionId }
              : undefined,
          },
        }),
        this.prisma.reserveServiceCycle.count({
          where: {
            status: 'ACTIVE',
            company: companyFilter.battalionId
              ? { battalionId: companyFilter.battalionId }
              : undefined,
          },
        }),
        this.prisma.leaveRequest.count({
          where: {
            status: 'PENDING',
            soldier: {
              company: companyFilter.battalionId
                ? { battalionId: companyFilter.battalionId }
                : undefined,
            },
          },
        }),
      ]);

    return {
      companiesCount: companies.length,
      companies,
      totalUsers,
      activeServiceCycles: activeServices,
      pendingLeaveRequests: pendingLeaves,
    };
  }

  /**
   * Attendance across companies for active service cycles
   */
  async getAttendance(user: CompanyScopedUser, companyId?: string) {
    const battalionId = user.battalionId;

    const cycles = await this.prisma.reserveServiceCycle.findMany({
      where: {
        status: 'ACTIVE',
        company: companyId
          ? { id: companyId }
          : battalionId
            ? { battalionId }
            : undefined,
      },
      include: {
        company: { select: { id: true, name: true, code: true } },
        attendances: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                companyId: true,
                company: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    return cycles.map((cycle) => {
      const stats = {
        total: cycle.attendances.length,
        arrived: cycle.attendances.filter((a) => a.attendanceStatus === 'ARRIVED').length,
        notComing: cycle.attendances.filter((a) => a.attendanceStatus === 'NOT_COMING').length,
        pending: cycle.attendances.filter((a) => a.attendanceStatus === 'PENDING').length,
        late: cycle.attendances.filter((a) => a.attendanceStatus === 'LATE').length,
        leftEarly: cycle.attendances.filter((a) => a.attendanceStatus === 'LEFT_EARLY').length,
      };

      // Group reasons for not coming
      const reasons: Record<string, number> = {};
      cycle.attendances
        .filter((a) => a.attendanceStatus === 'NOT_COMING' && a.cannotAttendReason)
        .forEach((a) => {
          const reason = a.cannotAttendReason!;
          reasons[reason] = (reasons[reason] || 0) + 1;
        });

      return {
        cycleId: cycle.id,
        cycleName: cycle.name,
        company: cycle.company,
        startDate: cycle.startDate,
        endDate: cycle.endDate,
        stats,
        reasons,
      };
    });
  }

  /**
   * Manpower breakdown per company
   */
  async getManpower(user: CompanyScopedUser) {
    const battalionId = user.battalionId;
    const companyFilter = battalionId ? { battalionId } : {};

    const companies = await this.prisma.company.findMany({
      where: { ...companyFilter, isActive: true },
      include: {
        users: {
          where: { isActive: true },
          select: {
            id: true,
            role: true,
            militaryRole: true,
          },
        },
        departments: {
          where: { isActive: true },
          include: {
            _count: { select: { users: true } },
          },
        },
      },
    });

    return companies.map((company) => {
      const roleBreakdown: Record<string, number> = {};
      company.users.forEach((u) => {
        roleBreakdown[u.militaryRole] = (roleBreakdown[u.militaryRole] || 0) + 1;
      });

      return {
        companyId: company.id,
        companyName: company.name,
        companyCode: company.code,
        totalUsers: company.users.length,
        roleBreakdown,
        departments: company.departments.map((d) => ({
          id: d.id,
          name: d.name,
          code: d.code,
          userCount: d._count.users,
        })),
      };
    });
  }

  /**
   * Leave requests summary per company
   */
  async getLeaves(user: CompanyScopedUser, companyId?: string) {
    const battalionId = user.battalionId;

    const companies = await this.prisma.company.findMany({
      where: companyId
        ? { id: companyId }
        : battalionId
          ? { battalionId, isActive: true }
          : { isActive: true },
      select: { id: true, name: true, code: true },
    });

    const result = await Promise.all(
      companies.map(async (company) => {
        const [pending, active, overdue, totalSoldiers] = await Promise.all([
          this.prisma.leaveRequest.count({
            where: { status: 'PENDING', soldier: { companyId: company.id } },
          }),
          this.prisma.leaveRequest.count({
            where: { status: 'ACTIVE', soldier: { companyId: company.id } },
          }),
          this.prisma.leaveRequest.count({
            where: { status: 'OVERDUE', soldier: { companyId: company.id } },
          }),
          this.prisma.user.count({
            where: { companyId: company.id, isActive: true },
          }),
        ]);

        return {
          companyId: company.id,
          companyName: company.name,
          companyCode: company.code,
          totalSoldiers,
          pending,
          active,
          overdue,
          inBase: totalSoldiers - active,
        };
      }),
    );

    return result;
  }

  /**
   * Active service cycles per company
   */
  async getActiveServices(user: CompanyScopedUser) {
    const battalionId = user.battalionId;

    return this.prisma.reserveServiceCycle.findMany({
      where: {
        status: { in: ['ACTIVE', 'PLANNED'] },
        company: battalionId ? { battalionId } : undefined,
      },
      include: {
        company: { select: { id: true, name: true, code: true } },
        _count: { select: { attendances: true } },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  /**
   * Map data: active service cycles with locations for map display
   */
  async getMapData(user: CompanyScopedUser) {
    const battalionId = user.battalionId;

    const cycles = await this.prisma.reserveServiceCycle.findMany({
      where: {
        status: 'ACTIVE',
        locationLat: { not: null },
        locationLng: { not: null },
        company: battalionId ? { battalionId } : undefined,
      },
      select: {
        id: true,
        name: true,
        location: true,
        locationLat: true,
        locationLng: true,
        startDate: true,
        endDate: true,
        status: true,
        company: {
          select: {
            id: true,
            name: true,
            code: true,
            _count: { select: { users: true } },
          },
        },
        _count: { select: { attendances: true } },
      },
    });

    return cycles;
  }

  /**
   * Company detail overview for battalion admin
   */
  async getCompanyDetail(companyId: string, user: CompanyScopedUser) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        battalion: { select: { id: true, name: true } },
        departments: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            code: true,
            _count: { select: { users: true } },
          },
        },
        zones: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            description: true,
            tasks: {
              where: { isActive: true },
              select: { id: true, name: true, type: true, requiredPeopleCount: true },
            },
          },
        },
        _count: {
          select: { users: true, departments: true, zones: true },
        },
      },
    });

    if (!company) return null;

    // Get users grouped by military role
    const users = await this.prisma.user.findMany({
      where: { companyId, isActive: true },
      select: {
        id: true,
        fullName: true,
        role: true,
        militaryRole: true,
        department: { select: { id: true, name: true } },
      },
      orderBy: { fullName: 'asc' },
    });

    // Get active service cycle
    const activeCycle = await this.prisma.reserveServiceCycle.findFirst({
      where: { companyId, status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        location: true,
        startDate: true,
        endDate: true,
        _count: { select: { attendances: true } },
      },
    });

    return {
      ...company,
      users,
      activeCycle,
    };
  }
}
