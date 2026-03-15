import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PushService } from '../push/push.service';
import { ShiftScheduleStatus } from '@prisma/client';

@Injectable()
export class ShiftSchedulesService {
  constructor(
    private prisma: PrismaService,
    private pushService: PushService,
  ) {}

  async findOrCreate(date: Date, zoneId?: string) {
    // Try to find existing schedule
    let schedule = await this.prisma.shiftSchedule.findFirst({
      where: {
        date,
        zoneId: zoneId || null,
      },
      include: {
        zone: true,
        publishedBy: {
          select: { id: true, fullName: true },
        },
        assignments: {
          include: {
            shiftTemplate: true,
            task: { include: { zone: true } },
            soldier: {
              select: {
                id: true,
                fullName: true,
                armyNumber: true,
                role: true,
                skills: { include: { skill: true } },
              },
            },
          },
        },
      },
    });

    // Create if doesn't exist
    if (!schedule) {
      schedule = await this.prisma.shiftSchedule.create({
        data: {
          date,
          zoneId: zoneId || null,
          status: 'DRAFT',
        },
        include: {
          zone: true,
          publishedBy: {
            select: { id: true, fullName: true },
          },
          assignments: {
            include: {
              shiftTemplate: true,
              task: { include: { zone: true } },
              soldier: {
                select: {
                  id: true,
                  fullName: true,
                  armyNumber: true,
                  role: true,
                  skills: { include: { skill: true } },
                },
              },
            },
          },
        },
      });
    }

    return schedule;
  }

  async findByDateRange(startDate: Date, endDate: Date, zoneId?: string) {
    return this.prisma.shiftSchedule.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
        ...(zoneId ? { zoneId } : {}),
      },
      include: {
        zone: true,
        publishedBy: {
          select: { id: true, fullName: true },
        },
        _count: {
          select: { assignments: true },
        },
      },
      orderBy: { date: 'asc' },
    });
  }

  async getScheduleStatus(date: Date, zoneId?: string) {
    const schedule = await this.prisma.shiftSchedule.findFirst({
      where: {
        date,
        zoneId: zoneId || null,
      },
      include: {
        zone: true,
        publishedBy: {
          select: { id: true, fullName: true },
        },
      },
    });

    // Count assignments directly from ShiftAssignment table
    // (assignments are not linked to schedule until publish)
    const assignmentCount = await this.prisma.shiftAssignment.count({
      where: {
        date,
        ...(zoneId ? { task: { zoneId } } : {}),
      },
    });

    return {
      exists: !!schedule,
      status: schedule?.status || 'DRAFT',
      assignmentCount,
      publishedAt: schedule?.publishedAt,
      publishedBy: schedule?.publishedBy,
    };
  }

  async publish(date: Date, zoneId: string | undefined, userId: string) {
    // Find or create the schedule
    let schedule = await this.prisma.shiftSchedule.findFirst({
      where: {
        date,
        zoneId: zoneId || null,
      },
    });

    if (!schedule) {
      // Create schedule if it doesn't exist
      schedule = await this.prisma.shiftSchedule.create({
        data: {
          date,
          zoneId: zoneId || null,
          status: 'DRAFT',
        },
      });
    }

    if (schedule.status === 'PUBLISHED') {
      throw new BadRequestException('לוח משמרות זה כבר פורסם');
    }

    // Get all assignments for this schedule
    const assignments = await this.prisma.shiftAssignment.findMany({
      where: {
        date,
        ...(zoneId ? { task: { zoneId } } : {}),
      },
      include: {
        shiftTemplate: true,
        task: true,
        soldier: true,
      },
    });

    if (assignments.length === 0) {
      throw new BadRequestException('אין שיבוצים לפרסום');
    }

    // Update schedule status
    const updatedSchedule = await this.prisma.shiftSchedule.update({
      where: { id: schedule.id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        publishedById: userId,
      },
    });

    // Link all assignments to this schedule
    await this.prisma.shiftAssignment.updateMany({
      where: {
        date,
        ...(zoneId ? { task: { zoneId } } : {}),
      },
      data: {
        scheduleId: schedule.id,
        status: 'CONFIRMED',
      },
    });

    // Create notifications for all assigned soldiers
    const uniqueSoldierIds = [...new Set(assignments.map((a) => a.soldierId))];
    const zone = zoneId
      ? await this.prisma.zone.findUnique({ where: { id: zoneId } })
      : null;

    const formattedDate = date.toLocaleDateString('he-IL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const notifications = uniqueSoldierIds.map((soldierId) => {
      const soldierAssignments = assignments.filter((a) => a.soldierId === soldierId);
      const shiftsText = soldierAssignments
        .map((a) => `${a.shiftTemplate.displayName} - ${a.task.name}`)
        .join(', ');

      return {
        userId: soldierId,
        title: `שיבוץ משמרות חדש - ${formattedDate}`,
        content: `שובצת למשמרות הבאות${zone ? ` באזור ${zone.name}` : ''}: ${shiftsText}`,
      };
    });

    await this.prisma.notification.createMany({
      data: notifications,
    });

    // Send push notifications to all assigned soldiers
    for (const soldierId of uniqueSoldierIds) {
      const soldierAssignments = assignments.filter((a) => a.soldierId === soldierId);
      const shiftsText = soldierAssignments
        .map((a) => `${a.shiftTemplate.displayName} - ${a.task.name}`)
        .join(', ');

      await this.pushService.sendToUser(soldierId, {
        title: 'שיבוץ משמרות חדש',
        body: `שובצת למשמרות ב${formattedDate}${zone ? ` באזור ${zone.name}` : ''}: ${shiftsText}`,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        url: '/dashboard/shifts',
        tag: `shift-${schedule.id}`,
      });
    }

    return {
      schedule: updatedSchedule,
      assignmentsCount: assignments.length,
      notifiedSoldiers: uniqueSoldierIds.length,
    };
  }

  async unpublish(date: Date, zoneId?: string) {
    const schedule = await this.prisma.shiftSchedule.findFirst({
      where: {
        date,
        zoneId: zoneId || null,
      },
    });

    if (!schedule) {
      throw new NotFoundException('לוח משמרות לא נמצא');
    }

    if (schedule.status !== 'PUBLISHED') {
      throw new BadRequestException('לוח משמרות זה לא פורסם');
    }

    // Update schedule status back to draft
    const updatedSchedule = await this.prisma.shiftSchedule.update({
      where: { id: schedule.id },
      data: {
        status: 'DRAFT',
        publishedAt: null,
        publishedById: null,
      },
    });

    // Update assignments back to pending
    await this.prisma.shiftAssignment.updateMany({
      where: { scheduleId: schedule.id },
      data: {
        status: 'PENDING',
      },
    });

    return updatedSchedule;
  }
}
