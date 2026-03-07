import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private oauth2Client: any;
  private gmail: any;

  constructor(private configService: ConfigService) {
    this.initializeGmailClient();
  }

  private initializeGmailClient() {
    try {
      const clientId = this.configService.get('GMAIL_CLIENT_ID');
      const clientSecret = this.configService.get('GMAIL_CLIENT_SECRET');
      const refreshToken = this.configService.get('GMAIL_REFRESH_TOKEN');

      if (!clientId || !clientSecret) {
        this.logger.warn('Gmail API credentials not configured. Email service will be disabled.');
        return;
      }

      this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
      this.oauth2Client.setCredentials();

      this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
      this.logger.log('Gmail API client initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Gmail client:', error);
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.gmail) {
      this.logger.warn('Gmail not configured. Skipping email send. Check console for OTP codes.');
      return true; // Return true so the flow continues
    }

    try {
      const senderEmail = this.configService.get('GMAIL_SENDER_EMAIL');

      const message = [
        `From: מערכת ניהול - פלוגת יוגב <${senderEmail}>`,
        `To: ${options.to}`,
        `Subject: =?UTF-8?B?${Buffer.from(options.subject).toString('base64')}?=`,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=utf-8',
        '',
        options.html,
      ].join('\n');

      const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
        },
      });

      this.logger.log(`Email sent successfully to ${options.to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error);
      return false;
    }
  }

  async sendOTP(email: string, code: string): Promise<boolean> {
    // Always log OTP to console for development
    this.logger.log(`\n========================================`);
    this.logger.log(`OTP CODE for ${email}: ${code}`);
    this.logger.log(`========================================\n`);

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; direction: rtl; background-color: #f5f5f5; padding: 20px; }
          .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { text-align: center; border-bottom: 2px solid #4a5d23; padding-bottom: 20px; margin-bottom: 20px; }
          .header h1 { color: #4a5d23; margin: 0; }
          .code { font-size: 32px; font-weight: bold; text-align: center; color: #333; background: #f0f0f0; padding: 20px; border-radius: 8px; letter-spacing: 8px; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>מערכת ניהול - פלוגת יוגב</h1>
          </div>
          <p>שלום,</p>
          <p>הקוד לאימות הכניסה שלך למערכת:</p>
          <div class="code">${code}</div>
          <p>הקוד תקף ל-10 דקות.</p>
          <p>אם לא ביקשת קוד זה, התעלם מהודעה זו.</p>
          <div class="footer">
            פלוגת יוגב – ביחד מנצחים
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: 'קוד אימות - מערכת ניהול - פלוגת יוגב',
      html,
    });
  }

  async sendFormStatusUpdate(
    email: string,
    formType: string,
    status: 'APPROVED' | 'REJECTED',
    adminComment?: string,
  ): Promise<boolean> {
    const statusText = status === 'APPROVED' ? 'אושרה' : 'נדחתה';
    const statusColor = status === 'APPROVED' ? '#4a5d23' : '#c62828';

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; direction: rtl; background-color: #f5f5f5; padding: 20px; }
          .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { text-align: center; border-bottom: 2px solid #4a5d23; padding-bottom: 20px; margin-bottom: 20px; }
          .header h1 { color: #4a5d23; margin: 0; }
          .status { font-size: 24px; font-weight: bold; text-align: center; color: ${statusColor}; padding: 15px; border-radius: 8px; margin: 20px 0; background: ${status === 'APPROVED' ? '#e8f5e9' : '#ffebee'}; }
          .comment { background: #f5f5f5; padding: 15px; border-radius: 8px; margin-top: 15px; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>מערכת ניהול - פלוגת יוגב</h1>
          </div>
          <p>שלום,</p>
          <p>עדכון לגבי הבקשה שלך מסוג: <strong>${formType}</strong></p>
          <div class="status">הבקשה ${statusText}</div>
          ${adminComment ? `<div class="comment"><strong>הערת מפקד:</strong><br>${adminComment}</div>` : ''}
          <div class="footer">
            פלוגת יוגב – ביחד מנצחים
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: `עדכון בקשה – מערכת ניהול - פלוגת יוגב`,
      html,
    });
  }
}
