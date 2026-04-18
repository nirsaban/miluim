import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PushService } from '../push/push.service';
import { SocialActivityStatus, ParticipantStatus } from '@prisma/client';
import { CompanyScopeService, CompanyScopedUser } from '../../common/services/company-scope.service';

@Injectable()
export class SocialActivitiesService {
  constructor(
    private prisma: PrismaService,
    private pushService: PushService,
    private companyScopeService: CompanyScopeService,
  ) {}

  /**
   * Create a new social activity
   */
  async create(
    data: {
      title: string;
      description?: string;
      place: string;
      startTime: Date;
      endTime?: Date;
      maxParticipants?: number;
    },
    creatorId: string,
    user?: CompanyScopedUser,
  ) {
    const activity = await this.prisma.socialActivity.create({
      data: {
        title: data.title,
        description: data.description,
        place: data.place,
        startTime: data.startTime,
        endTime: data.endTime,
        maxParticipants: data.maxParticipants,
        createdById: creatorId,
        ...(user?.companyId && { companyId: user.companyId }),
      },
      include: {
        createdBy: {
          select: { id: true, fullName: true },
        },
      },
    });

    // Creator automatically joins
    await this.prisma.socialActivityParticipant.create({
      data: {
        activityId: activity.id,
        userId: creatorId,
        status: ParticipantStatus.JOINED,
      },
    });

    return activity;
  }

  /**
   * Get all active activities (DESC by startTime)
   */
  async findAll(user?: CompanyScopedUser) {
    const companyFilter = user ? this.companyScopeService.getCompanyFilter(user) : {};
    return this.prisma.socialActivity.findMany({
      where: {
        status: { in: [SocialActivityStatus.OPEN, SocialActivityStatus.IN_PROGRESS] },
        startTime: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Include activities from last 24h
        ...companyFilter,
      },
      include: {
        createdBy: {
          select: { id: true, fullName: true },
        },
        participants: {
          include: {
            user: {
              select: { id: true, fullName: true },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
        _count: {
          select: { participants: true },
        },
      },
      orderBy: { startTime: 'desc' },
    });
  }

  /**
   * Get a single activity by ID
   */
  async findOne(id: string) {
    const activity = await this.prisma.socialActivity.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, fullName: true, phone: true },
        },
        participants: {
          include: {
            user: {
              select: { id: true, fullName: true, phone: true },
            },
          },
          orderBy: [
            { status: 'desc' }, // CONFIRMED first
            { joinedAt: 'asc' },
          ],
        },
        _count: {
          select: { participants: true },
        },
      },
    });

    if (!activity) {
      throw new NotFoundException('הפעילות לא נמצאה');
    }

    return activity;
  }

  /**
   * Join an activity
   */
  async join(activityId: string, userId: string) {
    const activity = await this.prisma.socialActivity.findUnique({
      where: { id: activityId },
      include: {
        _count: { select: { participants: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
    });

    if (!activity) {
      throw new NotFoundException('הפעילות לא נמצאה');
    }

    if (activity.status !== SocialActivityStatus.OPEN) {
      throw new BadRequestException('הפעילות אינה פתוחה להצטרפות');
    }

    // Check max participants
    if (activity.maxParticipants && activity._count.participants >= activity.maxParticipants) {
      throw new BadRequestException('הפעילות מלאה');
    }

    // Check if already joined
    const existing = await this.prisma.socialActivityParticipant.findUnique({
      where: {
        activityId_userId: { activityId, userId },
      },
    });

    if (existing) {
      if (existing.status === ParticipantStatus.CANCELLED) {
        // Re-join
        return this.prisma.socialActivityParticipant.update({
          where: { id: existing.id },
          data: {
            status: ParticipantStatus.JOINED,
            joinedAt: new Date(),
            confirmedAt: null,
          },
        });
      }
      throw new BadRequestException('כבר הצטרפת לפעילות זו');
    }

    const participant = await this.prisma.socialActivityParticipant.create({
      data: {
        activityId,
        userId,
        status: ParticipantStatus.JOINED,
      },
      include: {
        user: { select: { fullName: true } },
      },
    });

    // Notify creator about new participant
    await this.pushService.sendToUser(activity.createdById, {
      title: '🎉 משתתף חדש!',
      body: `${participant.user.fullName} הצטרף/ה לפעילות "${activity.title}"`,
      icon: '/icons/icon-192x192.png',
      url: `/dashboard/social/initiation/${activityId}`,
      tag: `activity-join-${activityId}`,
    });

    // Update status if full
    if (activity.maxParticipants && activity._count.participants + 1 >= activity.maxParticipants) {
      await this.prisma.socialActivity.update({
        where: { id: activityId },
        data: { status: SocialActivityStatus.FULL },
      });
    }

    return participant;
  }

  /**
   * Confirm arrival to activity
   */
  async confirmArrival(activityId: string, userId: string) {
    const participant = await this.prisma.socialActivityParticipant.findUnique({
      where: {
        activityId_userId: { activityId, userId },
      },
      include: {
        user: { select: { fullName: true } },
        activity: {
          select: { title: true, createdById: true },
        },
      },
    });

    if (!participant) {
      throw new NotFoundException('לא נמצאה הרשמה לפעילות');
    }

    if (participant.status === ParticipantStatus.CONFIRMED) {
      throw new BadRequestException('כבר אישרת הגעה');
    }

    const updated = await this.prisma.socialActivityParticipant.update({
      where: { id: participant.id },
      data: {
        status: ParticipantStatus.CONFIRMED,
        confirmedAt: new Date(),
      },
    });

    // Notify creator about confirmation
    await this.pushService.sendToUser(participant.activity.createdById, {
      title: '✅ אישור הגעה!',
      body: `${participant.user.fullName} אישר/ה הגעה לפעילות "${participant.activity.title}"`,
      icon: '/icons/icon-192x192.png',
      url: `/dashboard/social/initiation/${activityId}`,
      tag: `activity-confirm-${activityId}`,
    });

    return updated;
  }

  /**
   * Leave an activity
   */
  async leave(activityId: string, userId: string) {
    const participant = await this.prisma.socialActivityParticipant.findUnique({
      where: {
        activityId_userId: { activityId, userId },
      },
      include: {
        activity: { select: { createdById: true } },
      },
    });

    if (!participant) {
      throw new NotFoundException('לא נמצאה הרשמה לפעילות');
    }

    // Creator cannot leave their own activity
    if (participant.activity.createdById === userId) {
      throw new BadRequestException('לא ניתן לעזוב פעילות שיצרת. ניתן לבטל אותה.');
    }

    return this.prisma.socialActivityParticipant.update({
      where: { id: participant.id },
      data: { status: ParticipantStatus.CANCELLED },
    });
  }

  /**
   * Cancel an activity (creator only)
   */
  async cancel(activityId: string, userId: string) {
    const activity = await this.prisma.socialActivity.findUnique({
      where: { id: activityId },
      include: {
        participants: {
          where: { status: { not: ParticipantStatus.CANCELLED } },
          select: { userId: true },
        },
      },
    });

    if (!activity) {
      throw new NotFoundException('הפעילות לא נמצאה');
    }

    if (activity.createdById !== userId) {
      throw new ForbiddenException('רק יוצר הפעילות יכול לבטל אותה');
    }

    const updated = await this.prisma.socialActivity.update({
      where: { id: activityId },
      data: { status: SocialActivityStatus.CANCELLED },
    });

    // Notify all participants about cancellation
    for (const participant of activity.participants) {
      if (participant.userId !== userId) {
        await this.pushService.sendToUser(participant.userId, {
          title: '❌ פעילות בוטלה',
          body: `הפעילות "${activity.title}" בוטלה`,
          icon: '/icons/icon-192x192.png',
          url: '/dashboard/social/initiation',
          tag: `activity-cancel-${activityId}`,
        });
      }
    }

    return updated;
  }

  /**
   * Send reminder to all participants (called by cron or manually)
   */
  async sendReminders() {
    const now = new Date();
    const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);

    // Find activities starting in the next 30 minutes that haven't been reminded
    const upcomingActivities = await this.prisma.socialActivity.findMany({
      where: {
        status: SocialActivityStatus.OPEN,
        startTime: {
          gte: now,
          lte: thirtyMinutesFromNow,
        },
      },
      include: {
        participants: {
          where: { status: { not: ParticipantStatus.CANCELLED } },
          select: { userId: true },
        },
      },
    });

    for (const activity of upcomingActivities) {
      // Update status to IN_PROGRESS
      await this.prisma.socialActivity.update({
        where: { id: activity.id },
        data: { status: SocialActivityStatus.IN_PROGRESS },
      });

      // Send push to all participants
      for (const participant of activity.participants) {
        await this.pushService.sendToUser(participant.userId, {
          title: '⏰ הפעילות מתחילה בקרוב!',
          body: `"${activity.title}" מתחילה בעוד 30 דקות ב${activity.place}`,
          icon: '/icons/icon-192x192.png',
          url: `/dashboard/social/initiation/${activity.id}`,
          tag: `activity-reminder-${activity.id}`,
        });
      }
    }

    return { reminded: upcomingActivities.length };
  }

  /**
   * Get user's activities (created + joined)
   */
  async getMyActivities(userId: string) {
    const [created, participating] = await Promise.all([
      this.prisma.socialActivity.findMany({
        where: { createdById: userId },
        include: {
          _count: { select: { participants: true } },
        },
        orderBy: { startTime: 'desc' },
      }),
      this.prisma.socialActivityParticipant.findMany({
        where: {
          userId,
          status: { not: ParticipantStatus.CANCELLED },
        },
        include: {
          activity: {
            include: {
              createdBy: { select: { fullName: true } },
              _count: { select: { participants: true } },
            },
          },
        },
        orderBy: { joinedAt: 'desc' },
      }),
    ]);

    return { created, participating };
  }
}
