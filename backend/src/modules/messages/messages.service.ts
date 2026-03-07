import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MessageType, MessagePriority } from '@prisma/client';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

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
    return this.prisma.message.create({
      data: {
        title: data.title,
        content: data.content,
        type: data.type || MessageType.GENERAL,
        priority: data.priority || MessagePriority.MEDIUM,
      },
    });
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
}
