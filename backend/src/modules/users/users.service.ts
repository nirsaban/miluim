import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole, MilitaryRole } from '@prisma/client';
import { CreatePreapprovedUserDto } from './dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        armyNumber: true,
        city: true,
        dailyJob: true,
        createdAt: true,
      },
      orderBy: { fullName: 'asc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        personalId: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        militaryRole: true,
        armyNumber: true,
        idNumber: true,
        city: true,
        dailyJob: true,
        fieldOfStudy: true,
        birthDay: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('משתמש לא נמצא');
    }

    return user;
  }

  async findContacts() {
    return this.prisma.user.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        militaryRole: true,
        department: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { fullName: 'asc' },
    });
  }

  async getRoles() {
    return this.prisma.role.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async updateProfile(userId: string, data: Partial<{
    phone: string;
    dailyJob: string;
    city: string;
    fieldOfStudy: string;
  }>) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        city: true,
        dailyJob: true,
        fieldOfStudy: true,
      },
    });

    return user;
  }

  async findAllSoldiersWithSkills() {
    return this.prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        militaryRole: true,
        armyNumber: true,
        city: true,
        dailyJob: true,
        createdAt: true,
        departmentId: true,
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        skills: {
          include: { skill: true },
        },
      },
      orderBy: { fullName: 'asc' },
    });
  }

  async getUserSkills(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        skills: {
          include: { skill: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('משתמש לא נמצא');
    }

    return user.skills;
  }

  async updateUserSkills(userId: string, skillIds: string[]) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('משתמש לא נמצא');
    }

    // Delete existing skills and create new ones
    await this.prisma.$transaction([
      this.prisma.soldierSkill.deleteMany({
        where: { soldierId: userId },
      }),
      ...skillIds.map((skillId) =>
        this.prisma.soldierSkill.create({
          data: {
            soldierId: userId,
            skillId,
          },
        }),
      ),
    ]);

    return this.getUserSkills(userId);
  }

  async updateUserRole(userId: string, role: UserRole) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('משתמש לא נמצא');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        fullName: true,
        role: true,
      },
    });
  }

  async updateMilitaryRole(userId: string, militaryRole: MilitaryRole) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('משתמש לא נמצא');
    }

    // Also update the legacy role based on the new military role
    const legacyRole = this.mapMilitaryRoleToLegacyRole(militaryRole);

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        militaryRole,
        role: legacyRole,
      },
      select: {
        id: true,
        fullName: true,
        militaryRole: true,
        role: true,
      },
    });
  }

  async updateDepartment(userId: string, departmentId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('משתמש לא נמצא');
    }

    // Verify department exists
    const department = await this.prisma.department.findUnique({
      where: { id: departmentId },
    });

    if (!department) {
      throw new NotFoundException('מחלקה לא נמצאה');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { departmentId },
      select: {
        id: true,
        fullName: true,
        departmentId: true,
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });
  }

  // Pre-approved users management

  async findAllPreapprovedUsers() {
    return this.prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        personalId: true,
        fullName: true,
        email: true,
        phone: true,
        militaryRole: true,
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        isPreApproved: true,
        isRegistered: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPreapprovedUser(dto: CreatePreapprovedUserDto) {
    // Check if personalId already exists
    const existing = await this.prisma.user.findUnique({
      where: { personalId: dto.personalId },
    });

    if (existing) {
      throw new ConflictException('מספר אישי כבר קיים במערכת');
    }

    // Check if department exists
    const department = await this.prisma.department.findUnique({
      where: { id: dto.departmentId },
    });

    if (!department) {
      throw new NotFoundException('מחלקה לא נמצאה');
    }

    // Map militaryRole to legacy role
    const legacyRole = this.mapMilitaryRoleToLegacyRole(dto.militaryRole);

    // Create pre-approved user
    const user = await this.prisma.user.create({
      data: {
        personalId: dto.personalId,
        fullName: dto.fullName,
        militaryRole: dto.militaryRole,
        departmentId: dto.departmentId,
        phone: dto.phone || '0000000000',
        // Temporary values - will be filled during registration
        email: `temp_${dto.personalId}@pending.local`,
        passwordHash: '',
        idNumber: dto.personalId,
        // Flags
        isPreApproved: true,
        isRegistered: false,
        isActive: true,
        // Legacy fields
        role: legacyRole,
        armyNumber: dto.personalId,
      },
      select: {
        id: true,
        personalId: true,
        fullName: true,
        militaryRole: true,
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        isPreApproved: true,
        isRegistered: true,
        createdAt: true,
      },
    });

    return user;
  }

  async deletePreapprovedUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('משתמש לא נמצא');
    }

    // Only allow deleting users who haven't completed registration
    if (user.isRegistered) {
      throw new ConflictException('לא ניתן למחוק משתמש שכבר השלים הרשמה');
    }

    await this.prisma.user.delete({
      where: { id },
    });

    return { success: true, message: 'משתמש נמחק בהצלחה' };
  }

  async getDepartments() {
    return this.prisma.department.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  private mapMilitaryRoleToLegacyRole(militaryRole: MilitaryRole): UserRole {
    // Permission mapping:
    // ADMIN: Full access (PLATOON_COMMANDER, SERGEANT_MAJOR, OPERATIONS_SGT)
    // LOGISTICS: Limited admin - shifts, skills, operational links (OPERATIONS_NCO)
    // OFFICER: Department-scoped - leave approval, department view (DUTY_OFFICER)
    // COMMANDER: Receives commander notifications (SQUAD_COMMANDER)
    // SOLDIER: Basic access (FIGHTER)
    const mapping: Record<MilitaryRole, UserRole> = {
      PLATOON_COMMANDER: UserRole.ADMIN,
      SERGEANT_MAJOR: UserRole.ADMIN,
      OPERATIONS_SGT: UserRole.ADMIN,
      OPERATIONS_NCO: UserRole.LOGISTICS,
      DUTY_OFFICER: UserRole.OFFICER,
      SQUAD_COMMANDER: UserRole.COMMANDER,
      FIGHTER: UserRole.SOLDIER,
    };

    return mapping[militaryRole] || UserRole.SOLDIER;
  }

  async getHomeData(userId: string) {
    // Get user with department info
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        militaryRole: true,
        departmentId: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('משתמש לא נמצא');
    }

    // Get active zone from zones table (first active zone)
    const activeZone = await this.prisma.zone.findFirst({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    });

    // Get department commander (SQUAD_COMMANDER or DUTY_OFFICER in same department)
    let departmentCommander = null;
    if (user.departmentId) {
      departmentCommander = await this.prisma.user.findFirst({
        where: {
          isActive: true,
          departmentId: user.departmentId,
          militaryRole: {
            in: ['SQUAD_COMMANDER', 'DUTY_OFFICER'],
          },
        },
        select: {
          id: true,
          fullName: true,
          phone: true,
          militaryRole: true,
        },
      });
    }

    // If no department commander, get platoon commander
    const platoonCommander = await this.prisma.user.findFirst({
      where: {
        isActive: true,
        militaryRole: {
          in: ['PLATOON_COMMANDER', 'SERGEANT_MAJOR'],
        },
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        militaryRole: true,
      },
    });

    const commander = departmentCommander || platoonCommander;

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all my shifts for today and future (to find current and next)
    const myShifts = await this.prisma.shiftAssignment.findMany({
      where: {
        soldierId: userId,
        date: {
          gte: today,
        },
      },
      include: {
        shiftTemplate: {
          select: {
            displayName: true,
            startTime: true,
            endTime: true,
            sortOrder: true,
          },
        },
        task: {
          include: {
            zone: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: [
        { date: 'asc' },
        { shiftTemplate: { sortOrder: 'asc' } },
      ],
    });

    // Find current shift (today) and next shift
    const todayShifts = myShifts.filter(s => {
      const shiftDate = new Date(s.date);
      shiftDate.setHours(0, 0, 0, 0);
      return shiftDate.getTime() === today.getTime();
    });

    const futureShifts = myShifts.filter(s => {
      const shiftDate = new Date(s.date);
      shiftDate.setHours(0, 0, 0, 0);
      return shiftDate.getTime() > today.getTime();
    });

    // Current shift is today's first shift
    const currentShift = todayShifts.length > 0 ? todayShifts[0] : null;

    // Next shift is either today's second shift or first future shift
    const nextShift = todayShifts.length > 1
      ? todayShifts[1]
      : (futureShifts.length > 0 ? futureShifts[0] : null);

    // Get notifications for user
    const notifications = await this.prisma.notification.findMany({
      where: {
        userId,
        isRead: false,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Get the user with role for message filtering
    const userWithRole = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    // Helper to get visible audiences based on user role
    const getVisibleAudiences = (userRole: string) => {
      switch (userRole) {
        case 'ADMIN':
          return ['ALL', 'COMMANDERS_PLUS', 'OFFICERS_PLUS', 'ADMIN_ONLY'];
        case 'LOGISTICS':
        case 'OFFICER':
          return ['ALL', 'COMMANDERS_PLUS', 'OFFICERS_PLUS'];
        case 'COMMANDER':
          return ['ALL', 'COMMANDERS_PLUS'];
        case 'SOLDIER':
        default:
          return ['ALL'];
      }
    };

    const visibleAudiences = getVisibleAudiences(userWithRole?.role || 'SOLDIER');

    // Get active messages filtered by targetAudience and department
    // Include global messages (departmentId: null) + messages for user's department
    const messages = await this.prisma.message.findMany({
      where: {
        isActive: true,
        targetAudience: { in: visibleAudiences as any },
        OR: [
          { departmentId: null }, // Global messages
          { departmentId: user.departmentId }, // User's department messages
        ],
      },
      include: {
        confirmations: {
          where: { userId },
          select: { confirmedAt: true },
        },
        department: {
          select: { id: true, name: true },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 10,
    });

    // Map messages to include isConfirmed status and department info
    const messagesWithConfirmation = messages.map((message) => ({
      id: message.id,
      title: message.title,
      content: message.content,
      type: message.type,
      priority: message.priority,
      targetAudience: message.targetAudience,
      requiresConfirmation: message.requiresConfirmation,
      isConfirmed: message.confirmations.length > 0,
      confirmedAt: message.confirmations[0]?.confirmedAt || null,
      createdAt: message.createdAt,
      isDepartmentMessage: message.departmentId !== null,
      departmentName: message.department?.name || null,
    }));

    const formatShift = (shift: any) => shift ? {
      id: shift.id,
      date: shift.date,
      shiftTemplate: {
        displayName: shift.shiftTemplate.displayName,
        startTime: shift.shiftTemplate.startTime,
        endTime: shift.shiftTemplate.endTime,
      },
      task: {
        name: shift.task.name,
        zone: shift.task.zone,
      },
    } : null;

    return {
      user: {
        ...user,
        activeZone,
        commander,
      },
      currentShift: formatShift(currentShift),
      nextShift: formatShift(nextShift),
      notifications,
      messages: messagesWithConfirmation,
    };
  }

  // Department view for OFFICER role

  async getDepartmentSoldiers(userId: string) {
    // Get the user's department
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { departmentId: true },
    });

    if (!user?.departmentId) {
      throw new NotFoundException('משתמש לא משויך למחלקה');
    }

    // Get all soldiers in the department
    return this.prisma.user.findMany({
      where: {
        isActive: true,
        departmentId: user.departmentId,
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        militaryRole: true,
        armyNumber: true,
        skills: {
          include: { skill: true },
        },
      },
      orderBy: { fullName: 'asc' },
    });
  }

  async getDepartmentAnalytics(userId: string) {
    // Get the user's department
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        departmentId: true,
        department: {
          select: { id: true, name: true },
        },
      },
    });

    if (!user?.departmentId) {
      throw new NotFoundException('משתמש לא משויך למחלקה');
    }

    const departmentId = user.departmentId;

    // Get total soldiers in department
    const totalSoldiers = await this.prisma.user.count({
      where: {
        isActive: true,
        departmentId,
      },
    });

    // Get current active service cycle
    const activeCycle = await this.prisma.reserveServiceCycle.findFirst({
      where: { status: 'ACTIVE' },
    });

    let attendanceStats = {
      arrived: 0,
      notComing: 0,
      pending: 0,
      late: 0,
    };

    if (activeCycle) {
      // Get attendance for department soldiers in current cycle
      const departmentUserIds = await this.prisma.user.findMany({
        where: { isActive: true, departmentId },
        select: { id: true },
      });
      const userIds = departmentUserIds.map(u => u.id);

      const attendances = await this.prisma.serviceAttendance.findMany({
        where: {
          serviceCycleId: activeCycle.id,
          userId: { in: userIds },
        },
        select: { attendanceStatus: true },
      });

      for (const att of attendances) {
        switch (att.attendanceStatus) {
          case 'ARRIVED':
            attendanceStats.arrived++;
            break;
          case 'NOT_COMING':
            attendanceStats.notComing++;
            break;
          case 'PENDING':
            attendanceStats.pending++;
            break;
          case 'LATE':
            attendanceStats.late++;
            break;
        }
      }
    }

    // Get active leaves for department soldiers
    const activeLeaves = await this.prisma.leaveRequest.count({
      where: {
        status: 'ACTIVE',
        soldier: {
          departmentId,
          isActive: true,
        },
      },
    });

    // Get today's shifts for department soldiers
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayShifts = await this.prisma.shiftAssignment.count({
      where: {
        date: {
          gte: today,
          lt: tomorrow,
        },
        soldier: {
          departmentId,
          isActive: true,
        },
      },
    });

    return {
      department: user.department,
      totalSoldiers,
      attendanceStats,
      activeLeaves,
      todayShifts,
      activeCycle: activeCycle ? {
        id: activeCycle.id,
        name: activeCycle.name,
      } : null,
    };
  }

  async getDepartmentSoldiersWithStatus(userId: string) {
    // Get the user's department
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { departmentId: true },
    });

    if (!user?.departmentId) {
      throw new NotFoundException('משתמש לא משויך למחלקה');
    }

    const departmentId = user.departmentId;

    // Get current active service cycle
    const activeCycle = await this.prisma.reserveServiceCycle.findFirst({
      where: { status: 'ACTIVE' },
    });

    // Get all soldiers in the department with their attendance and leave status
    const soldiers = await this.prisma.user.findMany({
      where: {
        isActive: true,
        departmentId,
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        militaryRole: true,
        armyNumber: true,
        skills: {
          include: { skill: true },
        },
        leaveRequests: {
          where: { status: 'ACTIVE' },
          take: 1,
          select: {
            id: true,
            type: true,
            exitTime: true,
            expectedReturn: true,
          },
        },
        serviceAttendances: activeCycle ? {
          where: { serviceCycleId: activeCycle.id },
          take: 1,
          select: {
            attendanceStatus: true,
            checkInAt: true,
          },
        } : undefined,
      },
      orderBy: { fullName: 'asc' },
    });

    return soldiers.map(soldier => ({
      ...soldier,
      activeLeave: soldier.leaveRequests[0] || null,
      attendance: soldier.serviceAttendances?.[0] || null,
      leaveRequests: undefined,
      serviceAttendances: undefined,
    }));
  }

  /**
   * Get comprehensive department statistics for officer dashboard
   */
  async getDepartmentComprehensiveStats(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        departmentId: true,
        department: { select: { id: true, name: true } },
      },
    });

    if (!user?.departmentId) {
      throw new NotFoundException('משתמש לא משויך למחלקה');
    }

    const departmentId = user.departmentId;

    // Get all department users
    const departmentUsers = await this.prisma.user.findMany({
      where: { isActive: true, departmentId },
      select: { id: true },
    });
    const userIds = departmentUsers.map(u => u.id);
    const totalUsers = userIds.length;

    // Get current active service cycle
    const activeCycle = await this.prisma.reserveServiceCycle.findFirst({
      where: { status: 'ACTIVE' },
    });

    // Attendance statistics
    let attendanceStats = {
      totalInCycle: 0,
      arrived: 0,
      notComing: 0,
      pending: 0,
      late: 0,
    };

    let arrivedUserIds: string[] = [];

    if (activeCycle) {
      const attendances = await this.prisma.serviceAttendance.findMany({
        where: {
          serviceCycleId: activeCycle.id,
          userId: { in: userIds },
        },
        select: { userId: true, attendanceStatus: true },
      });

      attendanceStats.totalInCycle = attendances.length;

      for (const att of attendances) {
        switch (att.attendanceStatus) {
          case 'ARRIVED':
            attendanceStats.arrived++;
            arrivedUserIds.push(att.userId);
            break;
          case 'NOT_COMING':
            attendanceStats.notComing++;
            break;
          case 'PENDING':
            attendanceStats.pending++;
            break;
          case 'LATE':
            attendanceStats.late++;
            arrivedUserIds.push(att.userId);
            break;
        }
      }
    }

    // Leave statistics (only for arrived users in cycle, or all users if no cycle)
    const leaveFilterUserIds = arrivedUserIds.length > 0 ? arrivedUserIds : userIds;

    const [activeLeaves, homeLeaves, shortLeaves, pendingRequests, approvedRequests, rejectedRequests] = await Promise.all([
      // Active leaves count
      this.prisma.leaveRequest.count({
        where: { status: 'ACTIVE', soldierId: { in: leaveFilterUserIds } },
      }),
      // Home leaves (active)
      this.prisma.leaveRequest.count({
        where: { status: 'ACTIVE', type: 'HOME', soldierId: { in: leaveFilterUserIds } },
      }),
      // Short leaves (active)
      this.prisma.leaveRequest.count({
        where: { status: 'ACTIVE', type: 'SHORT', soldierId: { in: leaveFilterUserIds } },
      }),
      // Pending requests
      this.prisma.leaveRequest.count({
        where: { status: 'PENDING', soldierId: { in: userIds } },
      }),
      // Approved (not yet active)
      this.prisma.leaveRequest.count({
        where: { status: 'APPROVED', soldierId: { in: userIds } },
      }),
      // Rejected (last 30 days)
      this.prisma.leaveRequest.count({
        where: {
          status: 'REJECTED',
          soldierId: { in: userIds },
          updatedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    // Get users currently on leave with details
    const usersOnLeave = await this.prisma.leaveRequest.findMany({
      where: { status: 'ACTIVE', soldierId: { in: leaveFilterUserIds } },
      include: {
        soldier: { select: { id: true, fullName: true, phone: true } },
        category: { select: { displayName: true } },
      },
      orderBy: { expectedReturn: 'asc' },
    });

    const usersAtHome = usersOnLeave.filter(l => l.type === 'HOME');
    const usersOnShortLeave = usersOnLeave.filter(l => l.type === 'SHORT');

    // Today's shifts
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayShifts = await this.prisma.shiftAssignment.count({
      where: {
        date: { gte: today, lt: tomorrow },
        soldierId: { in: userIds },
      },
    });

    // Calculate in base
    const inBase = (arrivedUserIds.length || totalUsers) - activeLeaves;

    return {
      department: user.department,
      activeCycle: activeCycle ? { id: activeCycle.id, name: activeCycle.name } : null,
      overview: {
        totalUsers,
        totalInCycle: attendanceStats.totalInCycle,
        inBase: Math.max(0, inBase),
        onLeave: activeLeaves,
        todayShifts,
      },
      attendance: {
        arrived: attendanceStats.arrived,
        notComing: attendanceStats.notComing,
        pending: attendanceStats.pending,
        late: attendanceStats.late,
        unconfirmed: attendanceStats.pending,
      },
      leaves: {
        active: activeLeaves,
        atHome: homeLeaves,
        shortLeave: shortLeaves,
        usersAtHome: usersAtHome.map(l => ({
          id: l.soldier.id,
          name: l.soldier.fullName,
          phone: l.soldier.phone,
          expectedReturn: l.expectedReturn,
        })),
        usersOnShortLeave: usersOnShortLeave.map(l => ({
          id: l.soldier.id,
          name: l.soldier.fullName,
          phone: l.soldier.phone,
          category: l.category?.displayName || 'אחר',
          expectedReturn: l.expectedReturn,
        })),
      },
      requests: {
        pending: pendingRequests,
        approved: approvedRequests,
        rejected: rejectedRequests,
      },
    };
  }

  /**
   * Get department leave requests with filters for officer
   */
  async getDepartmentLeaveRequests(
    userId: string,
    filters: {
      status?: string;
      type?: string;
      soldierId?: string;
      fromDate?: string;
      toDate?: string;
    } = {},
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { departmentId: true },
    });

    if (!user?.departmentId) {
      throw new NotFoundException('משתמש לא משויך למחלקה');
    }

    // Get department user IDs
    const departmentUsers = await this.prisma.user.findMany({
      where: { isActive: true, departmentId: user.departmentId },
      select: { id: true },
    });
    const userIds = departmentUsers.map(u => u.id);

    // Build filter
    const where: any = {
      soldierId: { in: userIds },
    };

    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.type) {
      where.type = filters.type;
    }
    if (filters.soldierId && userIds.includes(filters.soldierId)) {
      where.soldierId = filters.soldierId;
    }
    if (filters.fromDate) {
      where.createdAt = { ...where.createdAt, gte: new Date(filters.fromDate) };
    }
    if (filters.toDate) {
      where.createdAt = { ...where.createdAt, lte: new Date(filters.toDate) };
    }

    return this.prisma.leaveRequest.findMany({
      where,
      include: {
        soldier: {
          select: { id: true, fullName: true, phone: true, armyNumber: true },
        },
        category: { select: { id: true, displayName: true } },
        approvedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  /**
   * Get department messages history (sent by officers in this department)
   */
  async getDepartmentMessages(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { departmentId: true },
    });

    if (!user?.departmentId) {
      throw new NotFoundException('משתמש לא משויך למחלקה');
    }

    return this.prisma.message.findMany({
      where: {
        departmentId: user.departmentId,
        isActive: true,
      },
      include: {
        createdBy: { select: { id: true, fullName: true } },
        _count: { select: { confirmations: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
