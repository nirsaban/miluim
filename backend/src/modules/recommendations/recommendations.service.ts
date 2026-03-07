import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RecommendationCategory } from '@prisma/client';

@Injectable()
export class RecommendationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(category?: RecommendationCategory) {
    return this.prisma.recommendation.findMany({
      where: {
        isActive: true,
        ...(category && { category }),
      },
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
    return this.prisma.recommendation.findMany({
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
    const recommendation = await this.prisma.recommendation.findUnique({
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

    if (!recommendation) {
      throw new NotFoundException('המלצה לא נמצאה');
    }

    return recommendation;
  }

  async create(userId: string, data: {
    content: string;
    category?: RecommendationCategory;
  }) {
    return this.prisma.recommendation.create({
      data: {
        userId,
        content: data.content,
        category: data.category || RecommendationCategory.OTHER,
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
    const recommendation = await this.prisma.recommendation.findUnique({
      where: { id },
    });

    if (!recommendation) {
      throw new NotFoundException('המלצה לא נמצאה');
    }

    if (recommendation.userId !== userId) {
      throw new NotFoundException('אין הרשאה למחוק המלצה זו');
    }

    return this.prisma.recommendation.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
