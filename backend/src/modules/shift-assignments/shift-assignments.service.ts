import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ShiftAssignmentStatus, FormType } from '@prisma/client';
import { getIsraelTodayStart, getCurrentIsraelTime } from '../../common/utils/timezone';

@Injectable()
export class ShiftAssignmentsService {
  constructor(private prisma: PrismaService) {}

  async findByDateRange(startDate: Date, endDate: Date, zoneId?: string) {
    const where: any = {
      date: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (zoneId) {
      where.task = { zoneId };
    }

    return this.prisma.shiftAssignment.findMany({
      where,
      include: {
        shiftTemplate: true,
        task: {
          include: {
            zone: true,
            requirements: {
              include: { skill: true },
            },
          },
        },
        soldier: {
          select: {
            id: true,
            fullName: true,
            armyNumber: true,
            phone: true,
            role: true,
            skills: {
              include: { skill: true },
            },
          },
        },
      },
      orderBy: [{ date: 'asc' }, { shiftTemplate: { sortOrder: 'asc' } }],
    });
  }

  async findByDate(date: Date, zoneId?: string) {
    return this.findByDateRange(date, date, zoneId);
  }

  async getAvailableSoldiers(date: Date, shiftTemplateId: string, taskId?: string) {
    // Find the current active service cycle
    const currentCycle = await this.prisma.reserveServiceCycle.findFirst({
      where: { status: 'ACTIVE' },
    });

    // Get soldiers with active/approved leave that overlaps with this date
    const soldiersOnLeave = await this.prisma.leaveRequest.findMany({
      where: {
        status: { in: ['APPROVED', 'ACTIVE'] },
        exitTime: { lte: date },
        expectedReturn: { gte: date },
      },
      select: { soldierId: true },
    });
    const soldiersOnLeaveIds = soldiersOnLeave.map((l) => l.soldierId);

    // Get all active soldiers with their skills
    // Only include soldiers who confirmed arrival for the current service cycle
    // Exclude soldiers who are on leave for this date
    const soldiers = await this.prisma.user.findMany({
      where: {
        isActive: true,
        role: { not: 'ADMIN' },
        // Exclude soldiers with active leave on this date
        id: { notIn: soldiersOnLeaveIds.length > 0 ? soldiersOnLeaveIds : ['no-exclude'] },
        // Only include soldiers who have ARRIVED status in the current service cycle
        ...(currentCycle && {
          serviceAttendances: {
            some: {
              serviceCycleId: currentCycle.id,
              attendanceStatus: 'ARRIVED',
            },
          },
        }),
      },
      include: {
        skills: {
          include: { skill: true },
        },
        shiftAssignments: {
          where: {
            date,
            shiftTemplateId,
          },
        },
        soldierStatus: true,
      },
    });

    // Filter out soldiers who are already assigned to this shift
    const available = soldiers.filter(
      (s) => s.shiftAssignments.length === 0 && s.soldierStatus?.status !== 'LEAVE',
    );

    // If taskId is provided, sort by skill match
    if (taskId) {
      const task = await this.prisma.task.findUnique({
        where: { id: taskId },
        include: { requirements: true },
      });

      if (task) {
        const requiredSkillIds = task.requirements.map((r) => r.skillId);
        return available.sort((a, b) => {
          const aMatch = a.skills.filter((s) => requiredSkillIds.includes(s.skillId)).length;
          const bMatch = b.skills.filter((s) => requiredSkillIds.includes(s.skillId)).length;
          return bMatch - aMatch;
        });
      }
    }

    return available;
  }

  async create(data: {
    date: Date;
    shiftTemplateId: string;
    taskId: string;
    soldierId: string;
    notes?: string;
  }) {
    // Check if soldier is already assigned to this shift
    const existing = await this.prisma.shiftAssignment.findFirst({
      where: {
        date: data.date,
        shiftTemplateId: data.shiftTemplateId,
        soldierId: data.soldierId,
      },
    });

    if (existing) {
      throw new BadRequestException('החייל כבר משובץ למשמרת זו');
    }

    // Check for consecutive shifts - block assignment if soldier was in previous shift
    const shiftTemplates = await this.prisma.shiftTemplate.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    const currentShiftIndex = shiftTemplates.findIndex(
      (s) => s.id === data.shiftTemplateId,
    );

    if (currentShiftIndex > 0) {
      // Check if assigned to previous shift on same day
      const previousShift = shiftTemplates[currentShiftIndex - 1];
      const previousAssignment = await this.prisma.shiftAssignment.findFirst({
        where: {
          date: data.date,
          shiftTemplateId: previousShift.id,
          soldierId: data.soldierId,
        },
      });

      if (previousAssignment) {
        throw new BadRequestException(
          `לא ניתן לשבץ את החייל - משובץ למשמרת ${previousShift.displayName} הקודמת`,
        );
      }
    }

    // Check if this is the first shift - check last shift of previous day
    if (currentShiftIndex === 0 && shiftTemplates.length > 0) {
      const lastShift = shiftTemplates[shiftTemplates.length - 1];
      const previousDay = new Date(data.date);
      previousDay.setDate(previousDay.getDate() - 1);

      const previousDayAssignment = await this.prisma.shiftAssignment.findFirst({
        where: {
          date: previousDay,
          shiftTemplateId: lastShift.id,
          soldierId: data.soldierId,
        },
      });

      if (previousDayAssignment) {
        throw new BadRequestException(
          `לא ניתן לשבץ את החייל - משובץ למשמרת ${lastShift.displayName} מאתמול`,
        );
      }
    }

    // Also check if assigned to next shift (to prevent adding to middle shift)
    if (currentShiftIndex < shiftTemplates.length - 1) {
      const nextShift = shiftTemplates[currentShiftIndex + 1];
      const nextAssignment = await this.prisma.shiftAssignment.findFirst({
        where: {
          date: data.date,
          shiftTemplateId: nextShift.id,
          soldierId: data.soldierId,
        },
      });

      if (nextAssignment) {
        throw new BadRequestException(
          `לא ניתן לשבץ את החייל - משובץ למשמרת ${nextShift.displayName} הבאה`,
        );
      }
    }

    return this.prisma.shiftAssignment.create({
      data: {
        date: data.date,
        shiftTemplateId: data.shiftTemplateId,
        taskId: data.taskId,
        soldierId: data.soldierId,
        notes: data.notes,
      },
      include: {
        shiftTemplate: true,
        task: { include: { zone: true } },
        soldier: {
          select: {
            id: true,
            fullName: true,
            armyNumber: true,
            role: true,
          },
        },
      },
    });
  }

  async update(id: string, data: { status?: ShiftAssignmentStatus; notes?: string }) {
    const assignment = await this.prisma.shiftAssignment.findUnique({
      where: { id },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    return this.prisma.shiftAssignment.update({
      where: { id },
      data,
      include: {
        shiftTemplate: true,
        task: { include: { zone: true } },
        soldier: {
          select: {
            id: true,
            fullName: true,
            armyNumber: true,
            role: true,
          },
        },
      },
    });
  }

  async delete(id: string) {
    const assignment = await this.prisma.shiftAssignment.findUnique({
      where: { id },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    return this.prisma.shiftAssignment.delete({
      where: { id },
    });
  }

  async bulkCreate(assignments: {
    date: Date;
    shiftTemplateId: string;
    taskId: string;
    soldierId: string;
    notes?: string;
  }[]) {
    const results = [];
    for (const assignment of assignments) {
      try {
        const result = await this.create(assignment);
        results.push({ success: true, data: result });
      } catch (error) {
        results.push({ success: false, error: error.message, data: assignment });
      }
    }
    return results;
  }

  async moveAssignment(
    id: string,
    newTaskId: string,
    newShiftTemplateId?: string,
    newDate?: Date,
  ) {
    const assignment = await this.prisma.shiftAssignment.findUnique({
      where: { id },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    // Check for conflicts
    const conflict = await this.prisma.shiftAssignment.findFirst({
      where: {
        id: { not: id },
        date: newDate || assignment.date,
        shiftTemplateId: newShiftTemplateId || assignment.shiftTemplateId,
        soldierId: assignment.soldierId,
      },
    });

    if (conflict) {
      throw new BadRequestException('Soldier already has an assignment in this shift');
    }

    return this.prisma.shiftAssignment.update({
      where: { id },
      data: {
        taskId: newTaskId,
        shiftTemplateId: newShiftTemplateId || assignment.shiftTemplateId,
        date: newDate || assignment.date,
      },
      include: {
        shiftTemplate: true,
        task: { include: { zone: true } },
        soldier: {
          select: {
            id: true,
            fullName: true,
            armyNumber: true,
            role: true,
          },
        },
      },
    });
  }

  async getTaskFulfillment(date: Date, shiftTemplateId: string, taskId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        requirements: {
          include: { skill: true },
        },
        shiftAssignments: {
          where: { date, shiftTemplateId },
          include: {
            soldier: {
              select: {
                id: true,
                role: true,
                skills: { include: { skill: true } },
              },
            },
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const fulfillment = task.requirements.map((req) => {
      // Check both explicit skills AND role (role acts as implicit skill)
      const assignedWithSkill = task.shiftAssignments.filter((a) => {
        // Check if soldier has the skill explicitly
        const hasExplicitSkill = a.soldier.skills.some((s) => s.skillId === req.skillId);
        // Check if soldier's role matches the skill name (e.g., COMMANDER role = COMMANDER skill)
        const roleMatchesSkill = a.soldier.role === req.skill.name;
        return hasExplicitSkill || roleMatchesSkill;
      }).length;

      return {
        skillId: req.skillId,
        skillName: req.skill.displayName,
        required: req.quantity,
        assigned: assignedWithSkill,
        fulfilled: assignedWithSkill >= req.quantity,
      };
    });

    return {
      taskId,
      taskName: task.name,
      totalAssigned: task.shiftAssignments.length,
      requirements: fulfillment,
      allFulfilled: fulfillment.every((f) => f.fulfilled),
    };
  }

  // Helper to check if a soldier has a skill (either explicitly or via role)
  soldierHasSkill(soldier: { role: string; skills: { skill: { name: string } }[] }, skillName: string): boolean {
    return soldier.role === skillName || soldier.skills.some((s) => s.skill.name === skillName);
  }

  // ============================================================
  // ACTIVE SHIFT MANAGEMENT
  // ============================================================

  async getTodayActiveShifts(zoneId?: string) {
    const today = getIsraelTodayStart();

    const where: any = {
      date: today,
    };

    if (zoneId) {
      where.task = { zoneId };
    }

    // Get schedule with officer info
    const schedule = await this.prisma.shiftSchedule.findFirst({
      where: {
        date: today,
        zoneId: zoneId || null,
        status: 'PUBLISHED',
      },
      include: {
        shiftOfficer: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
      },
    });

    // Get all assignments for today with arrival info
    const assignments = await this.prisma.shiftAssignment.findMany({
      where,
      include: {
        shiftTemplate: true,
        task: {
          include: {
            zone: true,
          },
        },
        soldier: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            armyNumber: true,
            militaryRole: true,
          },
        },
      },
      orderBy: [{ shiftTemplate: { sortOrder: 'asc' } }, { task: { name: 'asc' } }],
    });

    // Group by shift template
    const groupedByShift = assignments.reduce((acc, assignment) => {
      const shiftId = assignment.shiftTemplateId;
      if (!acc[shiftId]) {
        acc[shiftId] = {
          shiftTemplate: assignment.shiftTemplate,
          assignments: [],
          stats: { total: 0, arrived: 0, pending: 0 },
        };
      }
      acc[shiftId].assignments.push({
        id: assignment.id,
        soldier: assignment.soldier,
        task: assignment.task,
        arrivedAt: assignment.arrivedAt,
        batteryLevel: assignment.batteryLevel,
        status: assignment.status,
      });
      acc[shiftId].stats.total++;
      if (assignment.arrivedAt) {
        acc[shiftId].stats.arrived++;
      } else {
        acc[shiftId].stats.pending++;
      }
      return acc;
    }, {} as Record<string, any>);

    return {
      date: today,
      schedule: schedule ? {
        id: schedule.id,
        shiftOfficer: schedule.shiftOfficer,
      } : null,
      shifts: Object.values(groupedByShift),
      totalStats: {
        total: assignments.length,
        arrived: assignments.filter(a => a.arrivedAt).length,
        pending: assignments.filter(a => !a.arrivedAt).length,
      },
    };
  }

  async confirmArrival(assignmentId: string, userId: string) {
    const assignment = await this.prisma.shiftAssignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    if (assignment.soldierId !== userId) {
      throw new BadRequestException('You can only confirm your own arrival');
    }

    if (assignment.arrivedAt) {
      throw new BadRequestException('Already confirmed arrival');
    }

    return this.prisma.shiftAssignment.update({
      where: { id: assignmentId },
      data: {
        arrivedAt: new Date(),
        status: 'CONFIRMED',
      },
      include: {
        shiftTemplate: true,
        task: { include: { zone: true } },
        soldier: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });
  }

  async updateActiveStatus(
    assignmentId: string,
    userId: string,
    data: { batteryLevel?: number },
  ) {
    const assignment = await this.prisma.shiftAssignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    if (assignment.soldierId !== userId) {
      throw new BadRequestException('You can only update your own status');
    }

    return this.prisma.shiftAssignment.update({
      where: { id: assignmentId },
      data: {
        batteryLevel: data.batteryLevel ?? assignment.batteryLevel,
      },
      include: {
        shiftTemplate: true,
        task: { include: { zone: true } },
        soldier: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });
  }

  // Shift officer confirms arrival FOR another soldier
  async confirmArrivalBySupervisor(assignmentId: string, supervisorId: string) {
    const today = getIsraelTodayStart();

    // Get current shift template to determine effective date
    const currentShiftData = await this.getCurrentShiftTemplate();
    const dateOffset = currentShiftData?.dateOffset || 0;

    // Use the correct date based on offset
    const effectiveDate = new Date(today);
    if (dateOffset !== 0) {
      effectiveDate.setDate(effectiveDate.getDate() + dateOffset);
    }

    // Verify the supervisor is shift officer for the effective date
    const schedule = await this.prisma.shiftSchedule.findFirst({
      where: {
        date: effectiveDate,
        shiftOfficerId: supervisorId,
      },
    });

    if (!schedule) {
      throw new BadRequestException('רק קצין תורן יכול לאשר הגעה של חיילים אחרים');
    }

    const assignment = await this.prisma.shiftAssignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    if (assignment.arrivedAt) {
      throw new BadRequestException('הגעה כבר אושרה');
    }

    return this.prisma.shiftAssignment.update({
      where: { id: assignmentId },
      data: {
        arrivedAt: new Date(),
        status: 'CONFIRMED',
      },
      include: {
        shiftTemplate: true,
        task: { include: { zone: true } },
        soldier: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
      },
    });
  }

  // Update equipment status (battery, missing items)
  async updateEquipmentStatus(
    assignmentId: string,
    userId: string,
    data: { batteryLevel?: number; missingItems?: string },
  ) {
    const today = getIsraelTodayStart();

    const assignment = await this.prisma.shiftAssignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    // Check if user is the soldier or the shift officer
    const isOwner = assignment.soldierId === userId;
    const schedule = await this.prisma.shiftSchedule.findFirst({
      where: {
        date: today,
        shiftOfficerId: userId,
      },
    });
    const isShiftOfficer = !!schedule;

    if (!isOwner && !isShiftOfficer) {
      throw new BadRequestException('אין הרשאה לעדכן סטטוס זה');
    }

    return this.prisma.shiftAssignment.update({
      where: { id: assignmentId },
      data: {
        batteryLevel: data.batteryLevel ?? assignment.batteryLevel,
        missingItems: data.missingItems !== undefined ? data.missingItems : assignment.missingItems,
      },
      include: {
        shiftTemplate: true,
        task: { include: { zone: true } },
        soldier: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
      },
    });
  }

  // Get current shift overview for shift officer - detailed view
  async getCurrentShiftOverview(userId: string) {
    const today = getIsraelTodayStart();

    // Check if user is shift officer today
    const schedule = await this.prisma.shiftSchedule.findFirst({
      where: {
        date: today,
        shiftOfficerId: userId,
      },
      include: {
        zone: true,
        shiftOfficer: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
      },
    });

    if (!schedule) {
      return null;
    }

    // Build where clause
    const whereClause: any = { date: today };
    if (schedule.zoneId) {
      whereClause.task = { zoneId: schedule.zoneId };
    }

    // Get all assignments for today
    const assignments = await this.prisma.shiftAssignment.findMany({
      where: whereClause,
      include: {
        shiftTemplate: true,
        task: {
          include: { zone: true },
        },
        soldier: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            militaryRole: true,
          },
        },
      },
      orderBy: [{ shiftTemplate: { sortOrder: 'asc' } }, { task: { name: 'asc' } }],
    });

    // Group by shift template and task
    const shiftGroups: Record<string, {
      shiftTemplate: any;
      tasks: Record<string, {
        task: any;
        soldiers: any[];
      }>;
      stats: { total: number; arrived: number };
    }> = {};

    for (const assignment of assignments) {
      const shiftId = assignment.shiftTemplateId;
      const taskId = assignment.taskId;

      if (!shiftGroups[shiftId]) {
        shiftGroups[shiftId] = {
          shiftTemplate: assignment.shiftTemplate,
          tasks: {},
          stats: { total: 0, arrived: 0 },
        };
      }

      if (!shiftGroups[shiftId].tasks[taskId]) {
        shiftGroups[shiftId].tasks[taskId] = {
          task: assignment.task,
          soldiers: [],
        };
      }

      shiftGroups[shiftId].tasks[taskId].soldiers.push({
        id: assignment.id,
        soldier: assignment.soldier,
        arrivedAt: assignment.arrivedAt,
        batteryLevel: assignment.batteryLevel,
        missingItems: assignment.missingItems,
        status: assignment.status,
      });

      shiftGroups[shiftId].stats.total++;
      if (assignment.arrivedAt) shiftGroups[shiftId].stats.arrived++;
    }

    // Convert tasks from Record to array
    const shifts = Object.values(shiftGroups).map((group) => ({
      ...group,
      tasks: Object.values(group.tasks),
    }));

    // Collect all missing items
    const allMissingItems = assignments
      .filter(a => a.missingItems)
      .map(a => ({
        soldier: a.soldier.fullName,
        task: a.task.name,
        items: a.missingItems,
      }));

    return {
      date: today,
      schedule: {
        id: schedule.id,
        zone: schedule.zone,
        shiftOfficer: schedule.shiftOfficer,
      },
      shifts,
      totalStats: {
        total: assignments.length,
        arrived: assignments.filter(a => a.arrivedAt).length,
        pending: assignments.filter(a => !a.arrivedAt).length,
      },
      missingItems: allMissingItems,
    };
  }

  async getMyTodayShift(userId: string) {
    const today = getIsraelTodayStart();

    const assignment = await this.prisma.shiftAssignment.findFirst({
      where: {
        soldierId: userId,
        date: today,
      },
      include: {
        shiftTemplate: true,
        task: {
          include: {
            zone: true,
          },
        },
        schedule: {
          include: {
            shiftOfficer: {
              select: {
                id: true,
                fullName: true,
                phone: true,
              },
            },
          },
        },
      },
      orderBy: { shiftTemplate: { sortOrder: 'asc' } },
    });

    if (!assignment) {
      return null;
    }

    // Get teammates in the same shift
    const teammates = await this.prisma.shiftAssignment.findMany({
      where: {
        date: today,
        shiftTemplateId: assignment.shiftTemplateId,
        soldierId: { not: userId },
      },
      include: {
        soldier: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
        task: true,
      },
    });

    return {
      id: assignment.id,
      date: today,
      shiftTemplate: assignment.shiftTemplate,
      task: assignment.task,
      arrivedAt: assignment.arrivedAt,
      batteryLevel: assignment.batteryLevel,
      status: assignment.status,
      shiftOfficer: assignment.schedule?.shiftOfficer || null,
      teammates: teammates.map(t => ({
        id: t.soldier.id,
        fullName: t.soldier.fullName,
        phone: t.soldier.phone,
        taskName: t.task.name,
      })),
    };
  }

  async assignShiftOfficer(scheduleId: string, officerId: string) {
    const schedule = await this.prisma.shiftSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    return this.prisma.shiftSchedule.update({
      where: { id: scheduleId },
      data: {
        shiftOfficerId: officerId,
      },
      include: {
        shiftOfficer: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
      },
    });
  }

  async getShiftOfficerDuty(userId: string) {
    const today = getIsraelTodayStart();

    const schedule = await this.prisma.shiftSchedule.findFirst({
      where: {
        date: today,
        shiftOfficerId: userId,
      },
      include: {
        zone: true,
        shiftOfficer: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
      },
    });

    if (!schedule) {
      return null;
    }

    // Build where clause for assignments
    const whereClause: any = {
      date: today,
    };
    if (schedule.zoneId) {
      whereClause.task = { zoneId: schedule.zoneId };
    }

    // Get all assignments for this schedule
    const assignments = await this.prisma.shiftAssignment.findMany({
      where: whereClause,
      include: {
        shiftTemplate: true,
        task: true,
        soldier: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            militaryRole: true,
          },
        },
      },
      orderBy: [{ shiftTemplate: { sortOrder: 'asc' } }, { soldier: { fullName: 'asc' } }],
    });

    return {
      schedule: {
        id: schedule.id,
        date: schedule.date,
        zone: schedule.zone,
      },
      isShiftOfficer: true,
      totalSoldiers: assignments.length,
      arrivedCount: assignments.filter(a => a.arrivedAt).length,
      pendingCount: assignments.filter(a => !a.arrivedAt).length,
      assignments: assignments.map(a => ({
        id: a.id,
        soldier: a.soldier,
        shiftTemplate: a.shiftTemplate,
        task: a.task,
        arrivedAt: a.arrivedAt,
        batteryLevel: a.batteryLevel,
      })),
    };
  }

  async findMyShifts(userId: string) {
    const today = getIsraelTodayStart();

    // Get shifts from 7 days ago to 14 days ahead
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 7);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 14);

    const myAssignments = await this.prisma.shiftAssignment.findMany({
      where: {
        soldierId: userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        shiftTemplate: true,
        task: {
          include: {
            zone: true,
          },
        },
      },
      orderBy: { date: 'asc' },
    });

    // For each assignment, get teammates (others in the same shift)
    const shiftsWithTeammates = await Promise.all(
      myAssignments.map(async (assignment) => {
        const teammates = await this.prisma.shiftAssignment.findMany({
          where: {
            date: assignment.date,
            shiftTemplateId: assignment.shiftTemplateId,
            soldierId: { not: userId },
          },
          include: {
            soldier: {
              select: {
                id: true,
                fullName: true,
                phone: true,
              },
            },
            task: true,
          },
        });

        return {
          id: assignment.id,
          date: assignment.date,
          shiftTemplate: {
            displayName: assignment.shiftTemplate.displayName,
            startTime: assignment.shiftTemplate.startTime,
            endTime: assignment.shiftTemplate.endTime,
          },
          task: {
            name: assignment.task.name,
            zone: assignment.task.zone
              ? { name: assignment.task.zone.name }
              : undefined,
          },
          teammates: teammates.map((t) => ({
            id: t.soldier.id,
            fullName: t.soldier.fullName,
            phone: t.soldier.phone,
            taskName: t.task.name,
          })),
        };
      }),
    );

    return shiftsWithTeammates;
  }

  // ============================================================
  // WORKLOAD ANALYTICS METHODS
  // ============================================================

  async getWorkloadsSummary(params: {
    startDate?: Date;
    endDate?: Date;
    departmentId?: string;
  }) {
    const where: any = {
      status: { in: [ShiftAssignmentStatus.COMPLETED, ShiftAssignmentStatus.CONFIRMED] },
    };

    if (params.startDate || params.endDate) {
      where.date = {};
      if (params.startDate) {
        where.date.gte = params.startDate;
      }
      if (params.endDate) {
        where.date.lte = params.endDate;
      }
    }

    // Get all assignments with soldier and shift template info
    const assignments = await this.prisma.shiftAssignment.findMany({
      where,
      include: {
        soldier: {
          select: {
            id: true,
            fullName: true,
            department: {
              select: { id: true, name: true },
            },
          },
        },
        shiftTemplate: {
          select: { id: true, displayName: true, name: true },
        },
        task: {
          select: { id: true, name: true },
        },
      },
    });

    // Filter by department if specified
    const filteredAssignments = params.departmentId
      ? assignments.filter((a) => a.soldier.department?.id === params.departmentId)
      : assignments;

    // Group by soldier
    const soldierWorkloads: Record<
      string,
      {
        soldier: { id: string; fullName: string; department: { id: string; name: string } | null };
        totalShifts: number;
        shiftsByTemplate: Record<string, number>;
        lastShiftDate: Date | null;
        taskBreakdown: Record<string, number>;
      }
    > = {};

    for (const assignment of filteredAssignments) {
      const soldierId = assignment.soldierId;

      if (!soldierWorkloads[soldierId]) {
        soldierWorkloads[soldierId] = {
          soldier: {
            id: assignment.soldier.id,
            fullName: assignment.soldier.fullName,
            department: assignment.soldier.department,
          },
          totalShifts: 0,
          shiftsByTemplate: {},
          lastShiftDate: null,
          taskBreakdown: {},
        };
      }

      soldierWorkloads[soldierId].totalShifts++;

      // Count by shift template
      const templateName = assignment.shiftTemplate.displayName || assignment.shiftTemplate.name;
      soldierWorkloads[soldierId].shiftsByTemplate[templateName] =
        (soldierWorkloads[soldierId].shiftsByTemplate[templateName] || 0) + 1;

      // Count by task
      const taskName = assignment.task.name;
      soldierWorkloads[soldierId].taskBreakdown[taskName] =
        (soldierWorkloads[soldierId].taskBreakdown[taskName] || 0) + 1;

      // Track latest shift
      if (
        !soldierWorkloads[soldierId].lastShiftDate ||
        assignment.date > soldierWorkloads[soldierId].lastShiftDate
      ) {
        soldierWorkloads[soldierId].lastShiftDate = assignment.date;
      }
    }

    // Convert to array and sort by total shifts
    return Object.values(soldierWorkloads).sort((a, b) => b.totalShifts - a.totalShifts);
  }

  async getUserWorkload(
    userId: string,
    params: {
      startDate?: Date;
      endDate?: Date;
    },
  ) {
    const where: any = {
      soldierId: userId,
      status: { in: [ShiftAssignmentStatus.COMPLETED, ShiftAssignmentStatus.CONFIRMED] },
    };

    if (params.startDate || params.endDate) {
      where.date = {};
      if (params.startDate) {
        where.date.gte = params.startDate;
      }
      if (params.endDate) {
        where.date.lte = params.endDate;
      }
    }

    // Get all completed assignments for this user
    const assignments = await this.prisma.shiftAssignment.findMany({
      where,
      include: {
        shiftTemplate: {
          select: { id: true, displayName: true, name: true, color: true },
        },
        task: {
          select: { id: true, name: true },
        },
      },
      orderBy: { date: 'desc' },
    });

    // Calculate statistics
    const totalShifts = assignments.length;
    const shiftsByTemplate: Record<string, { count: number; color?: string | null }> = {};
    const taskBreakdown: Record<string, number> = {};
    const shiftsByMonth: Record<string, number> = {};

    for (const assignment of assignments) {
      // By template
      const templateName = assignment.shiftTemplate.displayName || assignment.shiftTemplate.name;
      if (!shiftsByTemplate[templateName]) {
        shiftsByTemplate[templateName] = { count: 0, color: assignment.shiftTemplate.color ?? undefined };
      }
      shiftsByTemplate[templateName].count++;

      // By task
      const taskName = assignment.task.name;
      taskBreakdown[taskName] = (taskBreakdown[taskName] || 0) + 1;

      // By month
      const monthKey = assignment.date.toISOString().slice(0, 7); // YYYY-MM
      shiftsByMonth[monthKey] = (shiftsByMonth[monthKey] || 0) + 1;
    }

    // Recent shifts (last 10)
    const recentShifts = assignments.slice(0, 10).map((a) => ({
      id: a.id,
      date: a.date,
      shiftTemplate: a.shiftTemplate.displayName || a.shiftTemplate.name,
      task: a.task.name,
      color: a.shiftTemplate.color,
    }));

    // Monthly trend (last 6 months)
    const monthlyTrend = Object.entries(shiftsByMonth)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([month, count]) => ({ month, count }));

    return {
      totalShifts,
      shiftsByTemplate,
      taskBreakdown,
      recentShifts,
      monthlyTrend,
    };
  }

  // ============================================================
  // CURRENT SHIFT MANAGEMENT (based on time, not full day)
  // ============================================================

  /**
   * Get the current active shift template based on current time
   */
  async getCurrentShiftTemplate() {
    const israelTime = getCurrentIsraelTime(); // "HH:MM"
    const [currentHour, currentMinute] = israelTime.split(':').map(Number);
    const currentTimeMinutes = currentHour * 60 + currentMinute;

    const templates = await this.prisma.shiftTemplate.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    // Find the shift that the current time falls within
    for (const template of templates) {
      const [startH, startM] = template.startTime.split(':').map(Number);
      const [endH, endM] = template.endTime.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      let endMinutes = endH * 60 + endM;

      // Handle overnight shifts (e.g., 22:00 - 06:00)
      if (endMinutes < startMinutes) {
        // If current time is after start OR before end, it's in this shift
        if (currentTimeMinutes >= startMinutes || currentTimeMinutes < endMinutes) {
          return {
            template,
            dateOffset: currentTimeMinutes < endMinutes ? -1 : 0
          };
        }
      } else {
        // Normal shift
        if (currentTimeMinutes >= startMinutes && currentTimeMinutes < endMinutes) {
          return { template, dateOffset: 0 };
        }
      }
    }

    // If no exact match, return the next upcoming shift
    return templates[0] ? { template: templates[0], dateOffset: 0 } : null;
  }

  /**
   * Get current shift overview focusing only on the active shift (not full day)
   */
  async getCurrentShiftOnlyOverview(userId: string) {
    const today = getIsraelTodayStart();

    // Get current shift template
    const currentShiftData = await this.getCurrentShiftTemplate();
    if (!currentShiftData) {
      return null;
    }
    const { template: currentTemplate, dateOffset } = currentShiftData;

    // Use the correct date based on offset
    const effectiveDate = new Date(today);
    if (dateOffset !== 0) {
      effectiveDate.setDate(effectiveDate.getDate() + dateOffset);
    }

    // Check if user is shift officer for the effective date
    const schedule = await this.prisma.shiftSchedule.findFirst({
      where: {
        date: effectiveDate,
        shiftOfficerId: userId,
      },
      include: {
        zone: true,
        shiftOfficer: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
      },
    });

    if (!schedule) {
      return null;
    }

    // Build where clause
    const whereClause: any = {
      date: effectiveDate,
      shiftTemplateId: currentTemplate.id,
    };
    if (schedule.zoneId) {
      whereClause.task = { zoneId: schedule.zoneId };
    }

    // Get assignments only for the current shift
    const assignments = await this.prisma.shiftAssignment.findMany({
      where: whereClause,
      include: {
        shiftTemplate: true,
        task: {
          include: { zone: true },
        },
        soldier: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            militaryRole: true,
            role: true,
          },
        },
      },
      orderBy: [{ task: { name: 'asc' } }, { soldier: { fullName: 'asc' } }],
    });

    // Group by task
    const taskGroups: Record<string, {
      task: any;
      soldiers: any[];
      commanderCount: number;
    }> = {};

    for (const assignment of assignments) {
      const taskId = assignment.taskId;

      if (!taskGroups[taskId]) {
        taskGroups[taskId] = {
          task: assignment.task,
          soldiers: [],
          commanderCount: 0,
        };
      }

      const isCommander = assignment.soldier.role === 'COMMANDER' ||
                         assignment.soldier.militaryRole === 'SQUAD_COMMANDER' ||
                         assignment.soldier.militaryRole === 'DUTY_OFFICER';

      taskGroups[taskId].soldiers.push({
        id: assignment.id,
        soldier: assignment.soldier,
        arrivedAt: assignment.arrivedAt,
        batteryLevel: assignment.batteryLevel,
        missingItems: assignment.missingItems,
        status: assignment.status,
        isCommander,
      });

      if (isCommander) {
        taskGroups[taskId].commanderCount++;
      }
    }

    // Get shift submissions (SHIFT_REQUEST forms from today)
    const submissions = await this.prisma.formSubmission.findMany({
      where: {
        type: FormType.SHIFT_REQUEST,
        createdAt: {
          gte: today, // Still use today for submissions list (full day)
        },
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      date: effectiveDate,
      schedule: {
        id: schedule.id,
        zone: schedule.zone,
        shiftOfficer: schedule.shiftOfficer,
      },
      currentShift: {
        shiftTemplate: currentTemplate,
        tasks: Object.values(taskGroups),
        stats: {
          total: assignments.length,
          arrived: assignments.filter(a => a.arrivedAt).length,
          pending: assignments.filter(a => !a.arrivedAt).length,
          totalTasks: Object.keys(taskGroups).length,
        },
      },
      submissions: submissions.map(s => ({
        id: s.id,
        user: s.user,
        category: (s.content as any)?.category || 'other',
        message: (s.content as any)?.message || '',
        shiftName: (s.content as any)?.shiftName || '',
        taskName: (s.content as any)?.taskName || '',
        status: s.status,
        createdAt: s.createdAt,
      })),
    };
  }

  /**
   * Get all commanders in the current shift with task info
   */
  async getCurrentShiftCommanders(userId: string) {
    const today = getIsraelTodayStart();

    // Get current shift template
    const currentShiftData = await this.getCurrentShiftTemplate();
    if (!currentShiftData) {
      return [];
    }
    const { template: currentTemplate, dateOffset } = currentShiftData;

    // Use the correct date based on offset
    const effectiveDate = new Date(today);
    if (dateOffset !== 0) {
      effectiveDate.setDate(effectiveDate.getDate() + dateOffset);
    }

    // Check if user is shift officer for the effective date
    const schedule = await this.prisma.shiftSchedule.findFirst({
      where: {
        date: effectiveDate,
        shiftOfficerId: userId,
      },
    });

    if (!schedule) {
      return [];
    }

    // Build where clause for commanders only
    const whereClause: any = {
      date: effectiveDate,
      shiftTemplateId: currentTemplate.id,
      soldier: {
        OR: [
          { role: 'COMMANDER' },
          { militaryRole: 'SQUAD_COMMANDER' },
          { militaryRole: 'DUTY_OFFICER' },
        ],
      },
    };
    if (schedule.zoneId) {
      whereClause.task = { zoneId: schedule.zoneId };
    }

    const commanderAssignments = await this.prisma.shiftAssignment.findMany({
      where: whereClause,
      include: {
        task: {
          include: { zone: true },
        },
        soldier: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            militaryRole: true,
          },
        },
      },
      orderBy: { task: { name: 'asc' } },
    });

    return commanderAssignments.map(a => ({
      id: a.id,
      soldier: a.soldier,
      task: a.task,
      arrivedAt: a.arrivedAt,
      batteryLevel: a.batteryLevel,
    }));
  }

  /**
   * Update submission status (confirm receipt by shift officer)
   */
  async confirmSubmissionReceipt(submissionId: string, userId: string) {
    const today = getIsraelTodayStart();

    // Get current shift template to determine effective date
    const currentShiftData = await this.getCurrentShiftTemplate();
    const dateOffset = currentShiftData?.dateOffset || 0;

    // Use the correct date based on offset
    const effectiveDate = new Date(today);
    if (dateOffset !== 0) {
      effectiveDate.setDate(effectiveDate.getDate() + dateOffset);
    }

    // Verify user is shift officer for the effective date
    const schedule = await this.prisma.shiftSchedule.findFirst({
      where: {
        date: effectiveDate,
        shiftOfficerId: userId,
      },
    });

    if (!schedule) {
      throw new BadRequestException('רק קצין תורן יכול לאשר קבלת בקשות');
    }

    return this.prisma.formSubmission.update({
      where: { id: submissionId },
      data: {
        status: 'APPROVED',
        adminComment: `אושר ע"י קצין תורן`,
      },
    });
  }
}
