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
    checklistItems: {
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    },
    zone: true,
  } as const;

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
      include: {
        requirements: {
          include: { skill: true },
        },
        checklistItems: {
          orderBy: { sortOrder: 'asc' },
        },
        zone: true,
      },
      orderBy: [{ zone: { name: 'asc' } }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        requirements: {
          include: { skill: true },
        },
        checklistItems: {
          orderBy: { sortOrder: 'asc' },
        },
        zone: true,
      },
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
    requiredPeopleCount?: number;
    requirements?: TaskRequirementInput[];
    checklistItems?: {
      label: string;
      description?: string;
      externalLink?: string;
      isRequired?: boolean;
      sortOrder?: number;
    }[];
  }) {
    // Verify zone exists
    const zone = await this.prisma.zone.findUnique({
      where: { id: data.zoneId },
    });

    if (!zone) {
      throw new BadRequestException('אזור לא נמצא');
    }

    // Create task with requirements and checklist items
    return this.prisma.task.create({
      data: {
        zoneId: data.zoneId,
        name: data.name,
        description: data.description,
        requiredPeopleCount: data.requiredPeopleCount || 1,
        requirements: data.requirements?.length
          ? {
              create: data.requirements.map((req) => ({
                skillId: req.skillId,
                quantity: req.quantity,
              })),
            }
          : undefined,
        checklistItems: data.checklistItems?.length
          ? {
              create: data.checklistItems.map((item) => ({
                label: item.label,
                description: item.description,
                externalLink: item.externalLink,
                isRequired: item.isRequired ?? true,
                sortOrder: item.sortOrder ?? 0,
              })),
            }
          : undefined,
      },
      include: this.includeRequirements,
    });
  }

  async update(id: string, data: { 
    name?: string; 
    description?: string; 
    isActive?: boolean; 
    zoneId?: string; 
    requiredPeopleCount?: number;
    checklistItems?: {
      id?: string;
      label: string;
      description?: string;
      externalLink?: string;
      isRequired?: boolean;
      sortOrder?: number;
      isActive?: boolean;
    }[];
  }) {
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

    // Handle checklist items update if provided
    if (data.checklistItems) {
      // This is a simplified approach: update existing, create new, keep rest
      // A more robust approach would delete removed items, but here we use isActive flag
      await Promise.all(
        data.checklistItems.map((item) => {
          if (item.id) {
            return this.prisma.taskChecklistItem.update({
              where: { id: item.id },
              data: {
                label: item.label,
                description: item.description,
                externalLink: item.externalLink,
                isRequired: item.isRequired,
                sortOrder: item.sortOrder,
                isActive: item.isActive,
              },
            });
          } else {
            return this.prisma.taskChecklistItem.create({
              data: {
                taskId: id,
                label: item.label,
                description: item.description,
                externalLink: item.externalLink,
                isRequired: item.isRequired ?? true,
                sortOrder: item.sortOrder ?? 0,
              },
            });
          }
        }),
      );
    }

    return this.prisma.task.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.zoneId && { zoneId: data.zoneId }),
        ...(data.requiredPeopleCount !== undefined && { requiredPeopleCount: data.requiredPeopleCount }),
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
