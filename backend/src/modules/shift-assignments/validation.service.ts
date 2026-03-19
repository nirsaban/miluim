import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface ValidationResult {
  isValid: boolean;
  warnings: ValidationWarning[];
  errors: ValidationError[];
}

export interface ValidationWarning {
  type: string;
  message: string;
  details?: any;
}

export interface ValidationError {
  type: string;
  message: string;
  details?: any;
}

@Injectable()
export class ValidationService {
  constructor(private prisma: PrismaService) {}

  async validateAssignment(
    date: Date,
    shiftTemplateId: string,
    taskId: string,
    soldierId: string,
  ): Promise<ValidationResult> {
    const warnings: ValidationWarning[] = [];
    const errors: ValidationError[] = [];

    // Get soldier info
    const soldier = await this.prisma.user.findUnique({
      where: { id: soldierId },
      include: {
        skills: { include: { skill: true } },
        soldierStatus: true,
        shiftAssignments: {
          where: {
            date: {
              gte: new Date(date.getTime() - 24 * 60 * 60 * 1000), // Yesterday
              lte: new Date(date.getTime() + 24 * 60 * 60 * 1000), // Tomorrow
            },
          },
          include: { shiftTemplate: true },
        },
      },
    });

    if (!soldier) {
      errors.push({
        type: 'SOLDIER_NOT_FOUND',
        message: 'חייל לא נמצא במערכת',
      });
      return { isValid: false, warnings, errors };
    }

    // Check if soldier is on leave
    if (soldier.soldierStatus?.status === 'LEAVE') {
      errors.push({
        type: 'SOLDIER_ON_LEAVE',
        message: 'החייל נמצא ביציאה',
      });
    }

    // Check if soldier is sick
    if (soldier.soldierStatus?.status === 'SICK') {
      errors.push({
        type: 'SOLDIER_SICK',
        message: 'החייל מדווח כחולה',
      });
    }

    // Check for double assignment in same shift
    const sameShiftAssignment = soldier.shiftAssignments.find(
      (a) =>
        a.date.toISOString().split('T')[0] === date.toISOString().split('T')[0] &&
        a.shiftTemplateId === shiftTemplateId,
    );

    if (sameShiftAssignment) {
      errors.push({
        type: 'ALREADY_ASSIGNED',
        message: 'החייל כבר משובץ למשמרת זו',
      });
    }

    // Check consecutive shifts (warning only)
    const consecutiveShifts = this.checkConsecutiveShifts(
      soldier.shiftAssignments,
      date,
      shiftTemplateId,
    );

    if (consecutiveShifts) {
      warnings.push({
        type: 'CONSECUTIVE_SHIFTS',
        message: 'החייל משובץ למשמרות רצופות',
        details: consecutiveShifts,
      });
    }

    // Check task requirements
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { requirements: { include: { skill: true } } },
    });

    if (task && task.requirements.length > 0) {
      const soldierSkillIds = soldier.skills.map((s) => s.skillId);
      const soldierSkillNames = soldier.skills.map((s) => s.skill.name);

      // Check if soldier matches any requirement (via explicit skill OR role)
      const matchingRequirements = task.requirements.filter((r) =>
        soldierSkillIds.includes(r.skillId) || soldier.role === r.skill.name,
      );

      if (matchingRequirements.length === 0) {
        warnings.push({
          type: 'NO_MATCHING_SKILLS',
          message: 'לחייל אין כישורים מתאימים למשימה זו',
          details: {
            requiredSkills: task.requirements.map((r) => r.skill.displayName),
            soldierSkills: soldier.skills.map((s) => s.skill.displayName),
            soldierRole: soldier.role,
          },
        });
      }
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors,
    };
  }

  async validateDaySchedule(
    date: Date,
    zoneId?: string,
  ): Promise<{
    tasks: {
      taskId: string;
      taskName: string;
      shifts: {
        shiftTemplateId: string;
        shiftName: string;
        isValid: boolean;
        requiredPeopleCount: number;
        assignedCount: number;
        skillRequirements: {
          skillId: string;
          skillName: string;
          required: number;
          assigned: number;
          fulfilled: boolean;
        }[];
      }[];
    }[];
    summary: {
      totalTasks: number;
      fulfilledTasks: number;
      warnings: number;
    };
  }> {
    const tasks = await this.prisma.task.findMany({
      where: {
        isActive: true,
        ...(zoneId ? { zoneId } : {}),
      },
      include: {
        requirements: { include: { skill: true } },
        zone: true,
      },
    });

    const shiftTemplates = await this.prisma.shiftTemplate.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    const assignments = await this.prisma.shiftAssignment.findMany({
      where: {
        date,
        ...(zoneId ? { task: { zoneId } } : {}),
      },
      include: {
        soldier: {
          select: {
            id: true,
            role: true,
            skills: { include: { skill: true } },
          },
        },
      },
    });

    const taskResults = [];
    let fulfilledCount = 0;
    let warningCount = 0;

    for (const task of tasks) {
      const shiftResults = [];

      for (const shift of shiftTemplates) {
        const shiftAssignments = assignments.filter(
          (a) => a.taskId === task.id && a.shiftTemplateId === shift.id,
        );

        // Primary validation: Check people count
        const requiredPeopleCount = task.requiredPeopleCount || 1;
        const assignedCount = shiftAssignments.length;
        const peopleCountFulfilled = assignedCount >= requiredPeopleCount;

        // Secondary: Skill requirements (informational/suggestions only)
        const skillRequirements = task.requirements.map((req) => {
          const assignedWithSkill = shiftAssignments.filter((a) => {
            const hasExplicitSkill = a.soldier.skills.some((s) => s.skillId === req.skillId);
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

        // Task is valid if people count is fulfilled
        const isValid = peopleCountFulfilled;
        if (isValid) fulfilledCount++;
        if (!isValid) warningCount++;

        shiftResults.push({
          shiftTemplateId: shift.id,
          shiftName: shift.displayName,
          isValid,
          requiredPeopleCount,
          assignedCount,
          skillRequirements,
        });
      }

      taskResults.push({
        taskId: task.id,
        taskName: task.name,
        shifts: shiftResults,
      });
    }

    return {
      tasks: taskResults,
      summary: {
        totalTasks: tasks.length * shiftTemplates.length,
        fulfilledTasks: fulfilledCount,
        warnings: warningCount,
      },
    };
  }

  private checkConsecutiveShifts(
    assignments: any[],
    newDate: Date,
    newShiftTemplateId: string,
  ): string | null {
    // Check if there's a shift in the previous or next shift slot
    const dateStr = newDate.toISOString().split('T')[0];

    const sameDayAssignments = assignments.filter(
      (a) => a.date.toISOString().split('T')[0] === dateStr,
    );

    if (sameDayAssignments.length > 0) {
      return 'שיבוץ נוסף באותו יום';
    }

    // Check yesterday and tomorrow
    const yesterday = new Date(newDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(newDate);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const nearbyAssignments = assignments.filter(
      (a) =>
        a.date.toISOString().split('T')[0] === yesterdayStr ||
        a.date.toISOString().split('T')[0] === tomorrowStr,
    );

    if (nearbyAssignments.length > 0) {
      return 'שיבוץ ביום סמוך';
    }

    return null;
  }
}
