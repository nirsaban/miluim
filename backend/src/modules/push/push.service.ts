import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import * as webPush from 'web-push';

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  data?: Record<string, any>; // Additional data to pass to service worker
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const vapidPublicKey = this.configService.get<string>('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = this.configService.get<string>('VAPID_PRIVATE_KEY');
    const vapidSubject = this.configService.get<string>('VAPID_SUBJECT') || 'mailto:admin@yogev.co.il';

    if (vapidPublicKey && vapidPrivateKey) {
      webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
      this.logger.log('VAPID keys configured successfully');
    } else {
      this.logger.warn('VAPID keys not configured. Push notifications will not work.');
    }
  }

  async subscribe(userId: string, subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  }) {
    // Upsert subscription - update if endpoint exists, create if not
    return this.prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        userId,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        isActive: true,
        updatedAt: new Date(),
      },
      create: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });
  }

  async unsubscribe(userId: string, endpoint: string) {
    return this.prisma.pushSubscription.updateMany({
      where: { userId, endpoint },
      data: { isActive: false },
    });
  }

  async unsubscribeAll(userId: string) {
    return this.prisma.pushSubscription.updateMany({
      where: { userId },
      data: { isActive: false },
    });
  }

  async sendToUser(userId: string, payload: PushPayload) {
    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId, isActive: true },
    });

    const results = await Promise.allSettled(
      subscriptions.map((sub) => this.sendNotification(sub, payload)),
    );

    // Clean up invalid subscriptions
    const invalidEndpoints: string[] = [];
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const error = result.reason;
        if (error.statusCode === 410 || error.statusCode === 404) {
          invalidEndpoints.push(subscriptions[index].endpoint);
        }
      }
    });

    if (invalidEndpoints.length > 0) {
      await this.prisma.pushSubscription.updateMany({
        where: { endpoint: { in: invalidEndpoints } },
        data: { isActive: false },
      });
    }

    return {
      sent: results.filter((r) => r.status === 'fulfilled').length,
      failed: results.filter((r) => r.status === 'rejected').length,
    };
  }

  async sendToAllUsers(payload: PushPayload) {
    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { isActive: true },
    });

    const results = await Promise.allSettled(
      subscriptions.map((sub) => this.sendNotification(sub, payload)),
    );

    // Clean up invalid subscriptions
    const invalidEndpoints: string[] = [];
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const error = result.reason;
        if (error.statusCode === 410 || error.statusCode === 404) {
          invalidEndpoints.push(subscriptions[index].endpoint);
        }
      }
    });

    if (invalidEndpoints.length > 0) {
      await this.prisma.pushSubscription.updateMany({
        where: { endpoint: { in: invalidEndpoints } },
        data: { isActive: false },
      });
    }

    return {
      sent: results.filter((r) => r.status === 'fulfilled').length,
      failed: results.filter((r) => r.status === 'rejected').length,
    };
  }

  private async sendNotification(
    subscription: { endpoint: string; p256dh: string; auth: string },
    payload: PushPayload,
  ) {
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    };

    return webPush.sendNotification(
      pushSubscription,
      JSON.stringify(payload),
    );
  }

  getVapidPublicKey(): string | undefined {
    return this.configService.get<string>('VAPID_PUBLIC_KEY');
  }
}
