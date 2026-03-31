import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  EmergencyEventStatus,
  ReserveServiceCycleStatus,
  ServiceAttendanceStatus,
  LeaveStatus,
} from '@prisma/client';
import { PushService } from '../push/push.service';

const DEFAULT_EMERGENCY_DURATION_MINUTES = 30;
const MIN_EMERGENCY_DURATION_MINUTES = 5;
const MAX_EMERGENCY_DURATION_MINUTES = 120;

@Injectable()
export class EmergencyService {
  private readonly logger = new Logger(EmergencyService.name);

  constructor(
    private prisma: PrismaService,
    private pushService: PushService,
  ) {}

  /**
   * Get the current active service cycle
   */
  private async getCurrentActiveCycle() {
    return this.prisma.reserveServiceCycle.findFirst({
      where: { status: ReserveServiceCycleStatus.ACTIVE },
    });
  }

  /**
   * Get target users for emergency:
   * - ALL users who arrived to the current service cycle (ARRIVED or LATE)
   * - Includes users on leave - everyone must report they're safe
   */
  private async getTargetUserIds(): Promise<string[]> {
    const cycle = await this.getCurrentActiveCycle();

    if (!cycle) {
      // No active cycle - return empty list
      return [];
    }

    // Get ALL users who arrived to the current cycle (including those on leave)
    const arrivedAttendances = await this.prisma.serviceAttendance.findMany({
      where: {
        serviceCycleId: cycle.id,
        attendanceStatus: {
          in: [ServiceAttendanceStatus.ARRIVED, ServiceAttendanceStatus.LATE],
        },
      },
      select: { userId: true },
    });

    return arrivedAttendances.map((a) => a.userId);
  }

  /**
   * Check and auto-expire emergency events that have passed their expiresAt time
   */
  private async autoExpireEvents(): Promise<void> {
    const now = new Date();

    await this.prisma.emergencyEvent.updateMany({
      where: {
        status: EmergencyEventStatus.ACTIVE,
        expiresAt: { lte: now },
      },
      data: {
        status: EmergencyEventStatus.EXPIRED,
      },
    });
  }

  /**
   * Start a new emergency event (ADMIN only)
   */
  async startEmergency(
    adminId: string,
    title?: string,
    durationMinutes?: number,
  ): Promise<any> {
    // Validate and set duration
    let duration = durationMinutes || DEFAULT_EMERGENCY_DURATION_MINUTES;
    if (duration < MIN_EMERGENCY_DURATION_MINUTES) {
      duration = MIN_EMERGENCY_DURATION_MINUTES;
    }
    if (duration > MAX_EMERGENCY_DURATION_MINUTES) {
      duration = MAX_EMERGENCY_DURATION_MINUTES;
    }
    // Auto-expire any past events first
    await this.autoExpireEvents();

    // Check if there's already an active emergency
    const existingActive = await this.prisma.emergencyEvent.findFirst({
      where: { status: EmergencyEventStatus.ACTIVE },
    });

    if (existingActive) {
      throw new BadRequestException(
        'קיים כבר אירוע חירום פעיל. יש להמתין לסיומו או לבטל אותו',
      );
    }

    // Get current active cycle
    const cycle = await this.getCurrentActiveCycle();

    // Get target users (snapshot at creation time)
    const targetUserIds = await this.getTargetUserIds();

    if (targetUserIds.length === 0) {
      throw new BadRequestException(
        'אין חיילים פעילים בבסיס כרגע. לא ניתן להפעיל מצב חירום',
      );
    }

    // Calculate expiry time based on duration
    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + duration * 60 * 1000);

    // Create the emergency event
    const emergency = await this.prisma.emergencyEvent.create({
      data: {
        title: title || 'בדיקת מצב חירום',
        serviceCycleId: cycle?.id,
        createdById: adminId,
        startedAt,
        expiresAt,
        status: EmergencyEventStatus.ACTIVE,
        targetUserIds,
      },
      include: {
        createdBy: {
          select: { id: true, fullName: true },
        },
        serviceCycle: {
          select: { id: true, name: true },
        },
      },
    });

    // Send push notifications to all target users
    this.notifyTargetUsers(targetUserIds, emergency.id).catch((err) => {
      this.logger.error('Failed to send emergency push notifications', err);
    });

    return {
      ...emergency,
      stats: {
        totalTargetUsers: targetUserIds.length,
        reportedCount: 0,
        notReportedCount: targetUserIds.length,
      },
    };
  }

  /**
   * Send push notifications to target users about the emergency
   */
  private async notifyTargetUsers(
    userIds: string[],
    emergencyId: string,
  ): Promise<void> {
    const payload = {
      title: 'מצב חירום - דווח שאתה בטוח',
      body: 'לחץ כדי לדווח שאתה בטוח',
      url: '/dashboard/home',
      tag: `emergency-${emergencyId}`,
      data: { emergencyId, type: 'emergency' },
    };

    const results = await Promise.allSettled(
      userIds.map((userId) => this.pushService.sendToUser(userId, payload)),
    );

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    this.logger.log(
      `Emergency notifications: sent=${sent}, failed=${failed}, total=${userIds.length}`,
    );
  }

  /**
   * Get the current active emergency event with stats
   */
  async getActiveEmergency(): Promise<any | null> {
    // Auto-expire any past events first
    await this.autoExpireEvents();

    const emergency = await this.prisma.emergencyEvent.findFirst({
      where: { status: EmergencyEventStatus.ACTIVE },
      include: {
        createdBy: {
          select: { id: true, fullName: true },
        },
        serviceCycle: {
          select: { id: true, name: true },
        },
        acknowledgements: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                phone: true,
                armyNumber: true,
                department: {
                  select: { id: true, name: true },
                },
              },
            },
          },
          orderBy: { reportedAt: 'asc' },
        },
      },
    });

    if (!emergency) {
      return null;
    }

    return this.enrichEmergencyWithStats(emergency);
  }

  /**
   * Get emergency event by ID with stats (for historical view)
   */
  async getEmergencyById(id: string): Promise<any> {
    const emergency = await this.prisma.emergencyEvent.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, fullName: true },
        },
        serviceCycle: {
          select: { id: true, name: true },
        },
        acknowledgements: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                phone: true,
                armyNumber: true,
                department: {
                  select: { id: true, name: true },
                },
              },
            },
          },
          orderBy: { reportedAt: 'asc' },
        },
      },
    });

    if (!emergency) {
      throw new NotFoundException('אירוע חירום לא נמצא');
    }

    return this.enrichEmergencyWithStats(emergency);
  }

  /**
   * Enrich emergency event with computed stats and user lists
   */
  private async enrichEmergencyWithStats(emergency: any): Promise<any> {
    const reportedUserIds = new Set(
      emergency.acknowledgements.map((a: any) => a.userId),
    );

    // Get users who haven't reported yet
    const notReportedUserIds = emergency.targetUserIds.filter(
      (id: string) => !reportedUserIds.has(id),
    );

    // Fetch user details for not-reported users
    const notReportedUsers = await this.prisma.user.findMany({
      where: { id: { in: notReportedUserIds } },
      select: {
        id: true,
        fullName: true,
        phone: true,
        armyNumber: true,
        department: {
          select: { id: true, name: true },
        },
      },
    });

    return {
      ...emergency,
      stats: {
        totalTargetUsers: emergency.targetUserIds.length,
        reportedCount: emergency.acknowledgements.length,
        notReportedCount: notReportedUserIds.length,
      },
      reportedUsers: emergency.acknowledgements.map((a: any) => ({
        ...a.user,
        reportedAt: a.reportedAt,
      })),
      notReportedUsers,
    };
  }

  /**
   * User reports "I am safe" for the active emergency
   */
  async reportSafe(userId: string): Promise<any> {
    // Auto-expire any past events first
    await this.autoExpireEvents();

    // Get active emergency
    const emergency = await this.prisma.emergencyEvent.findFirst({
      where: { status: EmergencyEventStatus.ACTIVE },
    });

    if (!emergency) {
      throw new BadRequestException('אין אירוע חירום פעיל כרגע');
    }

    // Check if user is in the target list OR is currently eligible
    const isInSnapshot = emergency.targetUserIds.includes(userId);
    const isCurrentlyEligible = !isInSnapshot && await this.isUserCurrentlyEligible(userId);

    if (!isInSnapshot && !isCurrentlyEligible) {
      throw new ForbiddenException('אינך נדרש לדווח באירוע חירום זה');
    }

    // Check if already reported
    const existing = await this.prisma.emergencyAcknowledgement.findUnique({
      where: {
        emergencyEventId_userId: {
          emergencyEventId: emergency.id,
          userId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('כבר דיווחת שאתה בטוח');
    }

    // Create acknowledgement
    const acknowledgement = await this.prisma.emergencyAcknowledgement.create({
      data: {
        emergencyEventId: emergency.id,
        userId,
      },
      include: {
        user: {
          select: { id: true, fullName: true },
        },
      },
    });

    return {
      message: 'דווחת בהצלחה שאתה בטוח',
      reportedAt: acknowledgement.reportedAt,
    };
  }

  /**
   * Check if a user needs to report for active emergency
   * Uses DYNAMIC check - user is target if they're currently in base (arrived + not on leave)
   */
  async getUserEmergencyStatus(userId: string): Promise<any> {
    // Auto-expire any past events first
    await this.autoExpireEvents();

    // Get active emergency
    const emergency = await this.prisma.emergencyEvent.findFirst({
      where: { status: EmergencyEventStatus.ACTIVE },
      select: {
        id: true,
        title: true,
        startedAt: true,
        expiresAt: true,
        targetUserIds: true,
        acknowledgements: {
          where: { userId },
          select: { reportedAt: true },
        },
      },
    });

    if (!emergency) {
      return { hasActiveEmergency: false };
    }

    // Check if user was in original snapshot OR is currently eligible
    // This allows users who arrived late to still report
    let isTargetUser = emergency.targetUserIds.includes(userId);

    // If not in original snapshot, check if user is currently eligible (dynamic check)
    if (!isTargetUser) {
      isTargetUser = await this.isUserCurrentlyEligible(userId);
    }

    const hasReported = emergency.acknowledgements.length > 0;

    return {
      hasActiveEmergency: true,
      emergencyId: emergency.id,
      title: emergency.title,
      startedAt: emergency.startedAt,
      expiresAt: emergency.expiresAt,
      isTargetUser,
      hasReported,
      reportedAt: hasReported ? emergency.acknowledgements[0].reportedAt : null,
    };
  }

  /**
   * Check if a user is currently eligible for emergency reporting
   * (in active cycle, arrived/late - includes users on leave)
   */
  private async isUserCurrentlyEligible(userId: string): Promise<boolean> {
    const cycle = await this.getCurrentActiveCycle();
    if (!cycle) return false;

    // Check if user has arrived to the cycle
    const attendance = await this.prisma.serviceAttendance.findFirst({
      where: {
        serviceCycleId: cycle.id,
        userId,
        attendanceStatus: {
          in: [ServiceAttendanceStatus.ARRIVED, ServiceAttendanceStatus.LATE],
        },
      },
    });

    // User is eligible if they arrived to the cycle
    return !!attendance;
  }

  /**
   * Cancel an active emergency (ADMIN only)
   */
  async cancelEmergency(emergencyId: string, adminId: string): Promise<any> {
    const emergency = await this.prisma.emergencyEvent.findUnique({
      where: { id: emergencyId },
    });

    if (!emergency) {
      throw new NotFoundException('אירוע חירום לא נמצא');
    }

    if (emergency.status !== EmergencyEventStatus.ACTIVE) {
      throw new BadRequestException('ניתן לבטל רק אירוע חירום פעיל');
    }

    return this.prisma.emergencyEvent.update({
      where: { id: emergencyId },
      data: { status: EmergencyEventStatus.CANCELLED },
    });
  }

  /**
   * Get historical emergency events (for admin view)
   */
  async getEmergencyHistory(limit = 10): Promise<any[]> {
    const events = await this.prisma.emergencyEvent.findMany({
      include: {
        createdBy: {
          select: { id: true, fullName: true },
        },
        serviceCycle: {
          select: { id: true, name: true },
        },
        _count: {
          select: { acknowledgements: true },
        },
      },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });

    return events.map((event) => ({
      ...event,
      stats: {
        totalTargetUsers: event.targetUserIds.length,
        reportedCount: event._count.acknowledgements,
        notReportedCount:
          event.targetUserIds.length - event._count.acknowledgements,
      },
    }));
  }
}
