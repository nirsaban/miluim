import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SocialService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.socialPost.findMany({
      where: { isActive: true },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findLatest(limit: number = 10) {
    return this.prisma.socialPost.findMany({
      where: { isActive: true },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async findOne(id: string) {
    const post = await this.prisma.socialPost.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('פוסט לא נמצא');
    }

    return post;
  }

  async create(userId: string, data: {
    imageUrl: string;
    caption?: string;
  }) {
    return this.prisma.socialPost.create({
      data: {
        userId,
        imageUrl: data.imageUrl,
        caption: data.caption,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });
  }

  async delete(id: string, userId: string) {
    const post = await this.prisma.socialPost.findUnique({
      where: { id },
    });

    if (!post) {
      throw new NotFoundException('פוסט לא נמצא');
    }

    if (post.userId !== userId) {
      throw new NotFoundException('אין הרשאה למחוק פוסט זה');
    }

    return this.prisma.socialPost.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
