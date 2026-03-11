import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MessageType, MessagePriority } from '@prisma/client';
import { PushService } from '../push/push.service';

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private pushService: PushService,
  ) {}

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

  async create(data: {
    title: string;
    content: string;
    type?: MessageType;
    priority?: MessagePriority;
  }) {
    const message = await this.prisma.message.create({
      data: {
        title: data.title,
        content: data.content,
        type: data.type || MessageType.GENERAL,
        priority: data.priority || MessagePriority.MEDIUM,
      },
    });

    // Send push notification for new messages (especially urgent ones)
    const shouldPush = data.type === MessageType.URGENT ||
                       data.priority === MessagePriority.HIGH ||
                       data.priority === MessagePriority.CRITICAL;

    if (shouldPush) {
      await this.pushService.sendToAllUsers({
        title: this.getMessageTypeLabel(data.type || MessageType.GENERAL),
        body: data.title,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: `message-${message.id}`,
        url: '/',
      });
    }

    return message;
  }

  async update(id: string, data: Partial<{
    title: string;
    content: string;
    type: MessageType;
    priority: MessagePriority;
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
}
