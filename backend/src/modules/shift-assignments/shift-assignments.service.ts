import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ShiftAssignmentStatus } from '@prisma/client';

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
    // Get all active soldiers with their skills
    const soldiers = await this.prisma.user.findMany({
      where: {
        isActive: true,
        role: { not: 'ADMIN' },
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
}
