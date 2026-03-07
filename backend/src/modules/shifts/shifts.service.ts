import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ShiftType } from '@prisma/client';

@Injectable()
export class ShiftsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.shiftPost.findMany({
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async findLatest(limit: number = 5) {
    return this.prisma.shiftPost.findMany({
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: { date: 'desc' },
      take: limit,
    });
  }

  async findOne(id: string) {
    const shift = await this.prisma.shiftPost.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    if (!shift) {
      throw new NotFoundException('סידור משמרות לא נמצא');
    }

    return shift;
  }

  async create(data: {
    date: Date;
    shiftType: ShiftType;
    message?: string;
    imageUrl?: string;
    createdById: string;
  }) {
    return this.prisma.shiftPost.create({
      data: {
        date: data.date,
        shiftType: data.shiftType,
        message: data.message,
        imageUrl: data.imageUrl,
        createdById: data.createdById,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });
  }

  async update(id: string, data: Partial<{
    date: Date;
    shiftType: ShiftType;
    message: string;
    imageUrl: string;
  }>) {
    const shift = await this.prisma.shiftPost.findUnique({
      where: { id },
    });

    if (!shift) {
      throw new NotFoundException('סידור משמרות לא נמצא');
    }

    return this.prisma.shiftPost.update({
      where: { id },
      data,
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });
  }

  async delete(id: string) {
    const shift = await this.prisma.shiftPost.findUnique({
      where: { id },
    });

    if (!shift) {
      throw new NotFoundException('סידור משמרות לא נמצא');
    }

    return this.prisma.shiftPost.delete({
      where: { id },
    });
  }
}
