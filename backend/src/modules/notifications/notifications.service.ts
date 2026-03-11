import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PushService } from '../push/push.service';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private pushService: PushService,
  ) {}

  async findByUser(userId: string, unreadOnly: boolean = false) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly && { isRead: false }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  async create(data: {
    userId: string;
    title: string;
    content: string;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        content: data.content,
      },
    });

    // Send push notification
    await this.pushService.sendToUser(data.userId, {
      title: data.title,
      body: data.content,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: `notification-${notification.id}`,
      url: '/notifications',
    });

    return notification;
  }

  async createForAllUsers(data: {
    title: string;
    content: string;
  }) {
    const users = await this.prisma.user.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    const notifications = users.map((user) => ({
      userId: user.id,
      title: data.title,
      content: data.content,
    }));

    const result = await this.prisma.notification.createMany({
      data: notifications,
    });

    // Send push notification to all users
    await this.pushService.sendToAllUsers({
      title: data.title,
      body: data.content,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: 'system-notification',
      url: '/notifications',
    });

    return result;
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('התראה לא נמצאה');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}
