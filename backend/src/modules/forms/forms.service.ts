import { Injectable, NotFoundException, forwardRef, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FormType, FormStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../../email/email.service';

const FORM_TYPE_LABELS: Record<FormType, string> = {
  SHORT_LEAVE: 'בקשת יציאה קצרה',
  EQUIPMENT_SHORTAGE: 'דיווח חוסר בציוד',
  HOME_LEAVE: 'בקשת יציאה הביתה',
  IMPROVEMENT_SUGGESTION: 'הצעות לשיפור',
  RESTAURANT_RECOMMENDATION: 'המלצת מסעדה',
  SHIFT_REQUEST: 'בקשה ממשמרת',
};

@Injectable()
export class FormsService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
    private emailService: EmailService,
  ) {}

  async findAll(status?: FormStatus) {
    return this.prisma.formSubmission.findMany({
      where: status ? { status } : undefined,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByUser(userId: string) {
    return this.prisma.formSubmission.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const form = await this.prisma.formSubmission.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!form) {
      throw new NotFoundException('טופס לא נמצא');
    }

    return form;
  }

  async create(userId: string, data: {
    type: FormType;
    content: Record<string, any>;
  }) {
    return this.prisma.formSubmission.create({
      data: {
        userId,
        type: data.type,
        content: data.content,
        status: FormStatus.PENDING,
      },
    });
  }

  async updateStatus(id: string, status: FormStatus, adminComment?: string) {
    const form = await this.prisma.formSubmission.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
    });

    if (!form) {
      throw new NotFoundException('טופס לא נמצא');
    }

    const updatedForm = await this.prisma.formSubmission.update({
      where: { id },
      data: {
        status,
        adminComment,
      },
    });

    const formTypeLabel = FORM_TYPE_LABELS[form.type];
    const statusLabel = status === FormStatus.APPROVED ? 'אושרה' : 'נדחתה';

    await this.notificationsService.create({
      userId: form.user.id,
      title: `עדכון בקשה - ${formTypeLabel}`,
      content: `הבקשה שלך ${statusLabel}${adminComment ? `. הערה: ${adminComment}` : ''}`,
    });

    await this.emailService.sendFormStatusUpdate(
      form.user.email,
      formTypeLabel,
      status as 'APPROVED' | 'REJECTED',
      adminComment,
    );

    return updatedForm;
  }
}
