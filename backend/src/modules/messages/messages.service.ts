import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MessageType, MessagePriority, MessageTargetAudience, UserRole, MilitaryRole } from '@prisma/client';
import { PushService } from '../push/push.service';
import { isDutyOfficer, isAdminMilitaryRole } from '../../common/constants/permissions';

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private pushService: PushService,
  ) {}

  // Helper to determine which targetAudiences a user can see based on their role
  private getVisibleAudiences(userRole: UserRole): MessageTargetAudience[] {
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
  }

  // Helper to get user roles that should see a message based on targetAudience
  private getTargetRoles(targetAudience: MessageTargetAudience): UserRole[] {
    switch (targetAudience) {
      case 'ADMIN_ONLY':
        return ['ADMIN'];
      case 'OFFICERS_PLUS':
        return ['ADMIN', 'LOGISTICS', 'OFFICER'];
      case 'COMMANDERS_PLUS':
        return ['ADMIN', 'LOGISTICS', 'OFFICER', 'COMMANDER'];
      case 'ALL':
      default:
        return ['ADMIN', 'LOGISTICS', 'OFFICER', 'COMMANDER', 'SOLDIER'];
    }
  }

  async findAll(type?: MessageType) {
    return this.prisma.message.findMany({
      where: {
        isActive: true,
        ...(type && { type }),
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async findOne(id: string) {
    const message = await this.prisma.message.findUnique({
      where: { id },
    });

    if (!message) {
      throw new NotFoundException('הודעה לא נמצאה');
    }

    return message;
  }

  async findByType(type: MessageType) {
    return this.prisma.message.findMany({
      where: {
        type,
        isActive: true,
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async create(
    data: {
      title: string;
      content: string;
      type?: MessageType;
      priority?: MessagePriority;
      targetAudience?: MessageTargetAudience;
      requiresConfirmation?: boolean;
    },
    creatorId?: string,
  ) {
    // Check if creator is a DUTY_OFFICER - if so, auto-scope to their department
    let departmentId: string | null = null;
    let creator: { militaryRole: MilitaryRole; departmentId: string | null } | null = null;

    if (creatorId) {
      creator = await this.prisma.user.findUnique({
        where: { id: creatorId },
        select: { militaryRole: true, departmentId: true },
      });

      // DUTY_OFFICER messages are auto-scoped to their department
      if (creator && isDutyOfficer(creator.militaryRole)) {
        if (!creator.departmentId) {
          throw new ForbiddenException('מ"מ חייב להיות משויך למחלקה כדי לשלוח הודעות');
        }
        departmentId = creator.departmentId;
      }
    }

    const message = await this.prisma.message.create({
      data: {
        title: data.title,
        content: data.content,
        type: data.type || MessageType.GENERAL,
        priority: data.priority || MessagePriority.MEDIUM,
        targetAudience: data.targetAudience || MessageTargetAudience.ALL,
        requiresConfirmation: data.requiresConfirmation || false,
        createdById: creatorId,
      },
    });

    // Send push notification for new messages (especially urgent ones)
    const shouldPush = data.type === MessageType.URGENT ||
                       data.priority === MessagePriority.HIGH ||
                       data.priority === MessagePriority.CRITICAL;

    if (shouldPush) {
      // Get target roles based on audience
      const targetRoles = this.getTargetRoles(data.targetAudience || MessageTargetAudience.ALL);

      // Build user filter - scope to department if DUTY_OFFICER created the message
      const userFilter: any = {
        isActive: true,
        role: { in: targetRoles },
      };

      if (departmentId) {
        // DUTY_OFFICER: only send to their department
        userFilter.departmentId = departmentId;
      }

      // Send push to users with matching roles (and department if scoped)
      const targetUsers = await this.prisma.user.findMany({
        where: userFilter,
        select: { id: true },
      });

      for (const user of targetUsers) {
        await this.pushService.sendToUser(user.id, {
          title: this.getMessageTypeLabel(data.type || MessageType.GENERAL),
          body: data.title,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          tag: `message-${message.id}`,
          url: '/dashboard/home',
        });
      }
    }

    return message;
  }

  async update(id: string, data: Partial<{
    title: string;
    content: string;
    type: MessageType;
    priority: MessagePriority;
    targetAudience: MessageTargetAudience;
    requiresConfirmation: boolean;
    isActive: boolean;
  }>) {
    const message = await this.prisma.message.findUnique({
      where: { id },
    });

    if (!message) {
      throw new NotFoundException('הודעה לא נמצאה');
    }

    return this.prisma.message.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    const message = await this.prisma.message.findUnique({
      where: { id },
    });

    if (!message) {
      throw new NotFoundException('הודעה לא נמצאה');
    }

    return this.prisma.message.update({
      where: { id },
      data: { isActive: false },
    });
  }

  private getMessageTypeLabel(type: MessageType): string {
    const labels: Record<MessageType, string> = {
      GENERAL: 'הודעה כללית',
      FOOD: 'הודעת אוכל',
      URGENT: 'הודעה דחופה',
      ANNOUNCEMENT: 'הכרזה',
      OPERATIONAL: 'הודעה מבצעית',
    };
    return labels[type] || 'הודעה חדשה';
  }

  // Message confirmation methods

  async confirmMessage(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('הודעה לא נמצאה');
    }

    // Upsert confirmation - create if not exists
    return this.prisma.messageConfirmation.upsert({
      where: {
        messageId_userId: {
          messageId,
          userId,
        },
      },
      update: {
        confirmedAt: new Date(),
      },
      create: {
        messageId,
        userId,
      },
    });
  }

  async getMessageConfirmations(messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('הודעה לא נמצאה');
    }

    return this.prisma.messageConfirmation.findMany({
      where: { messageId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            militaryRole: true,
            department: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { confirmedAt: 'desc' },
    });
  }

  async getMessageAnalytics(messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('הודעה לא נמצאה');
    }

    // Get total active users count
    const totalUsers = await this.prisma.user.count({
      where: { isActive: true },
    });

    // Get confirmed users count
    const confirmedCount = await this.prisma.messageConfirmation.count({
      where: { messageId },
    });

    // Get users who confirmed
    const confirmedUsers = await this.prisma.messageConfirmation.findMany({
      where: { messageId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            militaryRole: true,
            department: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { confirmedAt: 'desc' },
    });

    // Get users who haven't confirmed
    const confirmedUserIds = confirmedUsers.map((c) => c.userId);
    const notConfirmedUsers = await this.prisma.user.findMany({
      where: {
        isActive: true,
        id: { notIn: confirmedUserIds },
      },
      select: {
        id: true,
        fullName: true,
        militaryRole: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { fullName: 'asc' },
    });

    return {
      messageId,
      totalUsers,
      confirmedCount,
      notConfirmedCount: totalUsers - confirmedCount,
      confirmationRate: totalUsers > 0 ? Math.round((confirmedCount / totalUsers) * 100) : 0,
      confirmedUsers,
      notConfirmedUsers,
    };
  }

  async isMessageConfirmedByUser(messageId: string, userId: string) {
    const confirmation = await this.prisma.messageConfirmation.findUnique({
      where: {
        messageId_userId: {
          messageId,
          userId,
        },
      },
    });

    return !!confirmation;
  }

  async findAllWithConfirmationStatus(userId: string, userRole: UserRole, type?: MessageType) {
    // Get audiences this user can see based on their role
    const visibleAudiences = this.getVisibleAudiences(userRole);

    const messages = await this.prisma.message.findMany({
      where: {
        isActive: true,
        targetAudience: { in: visibleAudiences },
        ...(type && { type }),
      },
      include: {
        confirmations: {
          where: { userId },
          select: { confirmedAt: true },
        },
        _count: {
          select: { confirmations: true },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return messages.map((message) => ({
      ...message,
      isConfirmed: message.confirmations.length > 0,
      confirmedAt: message.confirmations[0]?.confirmedAt || null,
      confirmationCount: message._count.confirmations,
      confirmations: undefined,
      _count: undefined,
    }));
  }
}
