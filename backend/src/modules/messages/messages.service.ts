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
      departmentId?: string; // Optional: for department-scoped messages
    },
    creatorId?: string,
  ) {
    // Determine department scoping
    let departmentId: string | null = data.departmentId || null;
    let creator: { militaryRole: MilitaryRole; departmentId: string | null; role: UserRole } | null = null;

    if (creatorId) {
      creator = await this.prisma.user.findUnique({
        where: { id: creatorId },
        select: { militaryRole: true, departmentId: true, role: true },
      });

      // OFFICER role (including DUTY_OFFICER) creating without explicit departmentId - auto-scope
      if (creator && creator.role === 'OFFICER' && !data.departmentId) {
        if (!creator.departmentId) {
          throw new ForbiddenException('קצין חייב להיות משויך למחלקה כדי לשלוח הודעות');
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
        departmentId: departmentId,
      },
    });

    // Send push notification for ALL messages with full data
    // Get target roles based on audience
    const targetRoles = this.getTargetRoles(data.targetAudience || MessageTargetAudience.ALL);

    // Build user filter - scope to department if set
    const userFilter: any = {
      isActive: true,
      role: { in: targetRoles },
    };

    if (departmentId) {
      // Scope to department
      userFilter.departmentId = departmentId;
    }

    // Send push to users with matching roles (and department if scoped)
    const targetUsers = await this.prisma.user.findMany({
      where: userFilter,
      select: { id: true },
    });

    // Build notification with all relevant data
    const messageType = data.type || MessageType.GENERAL;
    const messagePriority = data.priority || MessagePriority.MEDIUM;
    const isHighPriority = messagePriority === MessagePriority.HIGH || messagePriority === MessagePriority.CRITICAL;
    const typeLabel = this.getMessageTypeLabel(messageType);
    const priorityLabel = this.getPriorityLabel(messagePriority);

    for (const user of targetUsers) {
      await this.pushService.sendToUser(user.id, {
        title: `${typeLabel}${isHighPriority ? ' ⚠️' : ''}`,
        body: `${data.title}\n\n${data.content}`,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: `message-${message.id}`,
        url: '/dashboard/home',
        data: {
          messageId: message.id,
          type: messageType,
          priority: messagePriority,
          priorityLabel,
          requiresConfirmation: data.requiresConfirmation || false,
          isDepartmentMessage: departmentId !== null,
        },
      });
    }

    return message;
  }

  /**
   * Create a department-scoped message (for officers)
   */
  async createDepartmentMessage(
    data: {
      title: string;
      content: string;
      type?: MessageType;
      priority?: MessagePriority;
      requiresConfirmation?: boolean;
    },
    creatorId: string,
  ) {
    // Get officer's department
    const officer = await this.prisma.user.findUnique({
      where: { id: creatorId },
      select: { departmentId: true, role: true },
    });

    if (!officer) {
      throw new ForbiddenException('משתמש לא נמצא');
    }

    if (!officer.departmentId) {
      throw new ForbiddenException('קצין חייב להיות משויך למחלקה כדי לשלוח הודעות מחלקתיות');
    }

    return this.create(
      {
        ...data,
        targetAudience: MessageTargetAudience.ALL, // Department messages go to all roles in department
        departmentId: officer.departmentId,
      },
      creatorId,
    );
  }

  /**
   * Find messages for a specific department (including global messages)
   */
  async findForDepartment(departmentId: string, userId: string, userRole: UserRole) {
    const visibleAudiences = this.getVisibleAudiences(userRole);

    const messages = await this.prisma.message.findMany({
      where: {
        isActive: true,
        targetAudience: { in: visibleAudiences },
        OR: [
          { departmentId: null }, // Global messages
          { departmentId: departmentId }, // Department-specific messages
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
    });

    return messages.map((message) => ({
      ...message,
      isConfirmed: message.confirmations.length > 0,
      confirmedAt: message.confirmations[0]?.confirmedAt || null,
      isDepartmentMessage: message.departmentId !== null,
      confirmations: undefined,
    }));
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
      OPERATIONAL: 'הודעה מבצעית',
      OPERATIONAL_GUIDELINES: 'הנחיות מבצעיות',
      CONDUCT_GUIDELINES: 'הנחיות התנהגות',
      FOOD_AND_OPERATIONS: 'אוכל ומבצעים',
      HAPPY_UPDATES: 'עדכונים שמחים',
    };
    return labels[type] || 'הודעה חדשה';
  }

  private getPriorityLabel(priority: MessagePriority): string {
    const labels: Record<MessagePriority, string> = {
      LOW: 'נמוכה',
      MEDIUM: 'רגילה',
      HIGH: 'גבוהה',
      CRITICAL: 'קריטית',
    };
    return labels[priority] || 'רגילה';
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
