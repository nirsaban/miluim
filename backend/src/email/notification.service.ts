import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from './email.service';

export interface NotificationChannel {
  send(to: string, message: NotificationMessage): Promise<boolean>;
}

export interface NotificationMessage {
  title: string;
  content: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private channels: Map<string, NotificationChannel> = new Map();

  constructor(private emailService: EmailService) {
    this.registerChannel('email', {
      send: async (to: string, message: NotificationMessage) => {
        return this.emailService.sendEmail({
          to,
          subject: message.title,
          html: `<p>${message.content}</p>`,
        });
      },
    });
  }

  registerChannel(name: string, channel: NotificationChannel) {
    this.channels.set(name, channel);
    this.logger.log(`Notification channel registered: ${name}`);
  }

  async send(
    channel: string,
    to: string,
    message: NotificationMessage,
  ): Promise<boolean> {
    const notificationChannel = this.channels.get(channel);

    if (!notificationChannel) {
      this.logger.warn(`Notification channel not found: ${channel}`);
      return false;
    }

    try {
      return await notificationChannel.send(to, message);
    } catch (error) {
      this.logger.error(`Failed to send notification via ${channel}:`, error);
      return false;
    }
  }

  async sendMultiple(
    channels: string[],
    to: string,
    message: NotificationMessage,
  ): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    for (const channel of channels) {
      const result = await this.send(channel, to, message);
      results.set(channel, result);
    }

    return results;
  }
}
