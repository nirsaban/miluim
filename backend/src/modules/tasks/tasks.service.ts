import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface TaskRequirementInput {
  skillId: string;
  quantity: number;
}

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  private readonly includeRequirements = {
    requirements: {
      include: { skill: true },
    },
    zone: true,
  };

  async findAll() {
    return this.prisma.task.findMany({
      where: { isActive: true },
      include: this.includeRequirements,
      orderBy: { name: 'asc' },
    });
  }

  async findByZone(zoneId: string) {
    return this.prisma.task.findMany({
      where: { zoneId, isActive: true },
      include: this.includeRequirements,
      orderBy: { name: 'asc' },
    });
  }

  async findAllAdmin() {
    return this.prisma.task.findMany({
      include: this.includeRequirements,
      orderBy: [{ zone: { name: 'asc' } }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: this.includeRequirements,
    });

    if (!task) {
      throw new NotFoundException('משימה לא נמצאה');
    }

    return task;
  }

  async create(data: {
    zoneId: string;
    name: string;
    description?: string;
    requirements?: TaskRequirementInput[];
  }) {
    // Verify zone exists
    const zone = await this.prisma.zone.findUnique({
      where: { id: data.zoneId },
    });

    if (!zone) {
      throw new BadRequestException('אזור לא נמצא');
    }

    // Create task with requirements
    return this.prisma.task.create({
      data: {
        zoneId: data.zoneId,
        name: data.name,
        description: data.description,
        requirements: data.requirements?.length
          ? {
              create: data.requirements.map((req) => ({
                skillId: req.skillId,
                quantity: req.quantity,
              })),
            }
          : undefined,
      },
      include: this.includeRequirements,
    });
  }

  async update(id: string, data: { name?: string; description?: string; isActive?: boolean; zoneId?: string }) {
    const task = await this.prisma.task.findUnique({ where: { id } });

    if (!task) {
      throw new NotFoundException('משימה לא נמצאה');
    }

    if (data.zoneId) {
      const zone = await this.prisma.zone.findUnique({
        where: { id: data.zoneId },
      });
      if (!zone) {
        throw new BadRequestException('אזור לא נמצא');
      }
    }

    return this.prisma.task.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.zoneId && { zoneId: data.zoneId }),
      },
      include: this.includeRequirements,
    });
  }

  async updateRequirements(id: string, requirements: TaskRequirementInput[]) {
    const task = await this.prisma.task.findUnique({ where: { id } });

    if (!task) {
      throw new NotFoundException('משימה לא נמצאה');
    }

    // Delete existing requirements and create new ones
    await this.prisma.$transaction([
      this.prisma.taskRequirement.deleteMany({
        where: { taskId: id },
      }),
      ...requirements.map((req) =>
        this.prisma.taskRequirement.create({
          data: {
            taskId: id,
            skillId: req.skillId,
            quantity: req.quantity,
          },
        }),
      ),
    ]);

    return this.findOne(id);
  }

  async delete(id: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });

    if (!task) {
      throw new NotFoundException('משימה לא נמצאה');
    }

    // Soft delete
    return this.prisma.task.update({
      where: { id },
      data: { isActive: false },
      include: this.includeRequirements,
    });
  }
}
