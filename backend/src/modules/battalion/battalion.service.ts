import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBattalionDto } from './dto/create-battalion.dto';
import { UpdateBattalionDto } from './dto/update-battalion.dto';

@Injectable()
export class BattalionService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateBattalionDto) {
    return this.prisma.battalion.create({
      data: {
        name: dto.name,
        description: dto.description,
      },
      include: {
        companies: true,
      },
    });
  }

  async findAll() {
    return this.prisma.battalion.findMany({
      where: { isActive: true },
      include: {
        companies: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            code: true,
            isActive: true,
            _count: {
              select: { users: true },
            },
          },
        },
        _count: {
          select: { companies: true, admins: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const battalion = await this.prisma.battalion.findUnique({
      where: { id },
      include: {
        companies: {
          where: { isActive: true },
          include: {
            _count: {
              select: { users: true, departments: true },
            },
          },
        },
        admins: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!battalion) {
      throw new NotFoundException('גדוד לא נמצא');
    }

    return battalion;
  }

  async update(id: string, dto: UpdateBattalionDto) {
    await this.findOne(id);
    return this.prisma.battalion.update({
      where: { id },
      data: dto,
    });
  }
}
