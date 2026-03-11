import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ReserveServiceCycleStatus,
  ServiceChecklistCategory,
} from '@prisma/client';

@Injectable()
export class ServiceChecklistService {
  constructor(private prisma: PrismaService) {}

  // Get current active cycle
  private async getCurrentActiveCycle() {
    const cycle = await this.prisma.reserveServiceCycle.findFirst({
      where: { status: ReserveServiceCycleStatus.ACTIVE },
    });

    if (!cycle) {
      throw new NotFoundException('אין סבב מילואים פעיל כרגע');
    }

    return cycle;
  }

  // Get all checklist items for current cycle
  async getAllForCurrentCycle() {
    const cycle = await this.getCurrentActiveCycle();

    return this.prisma.serviceAdminChecklist.findMany({
      where: { serviceCycleId: cycle.id },
      include: {
        completedBy: {
          select: { id: true, fullName: true },
        },
      },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { title: 'asc' }],
    });
  }

  // Get all checklist items for a specific cycle
  async getAllForCycle(cycleId: string) {
    return this.prisma.serviceAdminChecklist.findMany({
      where: { serviceCycleId: cycleId },
      include: {
        completedBy: {
          select: { id: true, fullName: true },
        },
      },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { title: 'asc' }],
    });
  }

  // Create a new checklist item
  async create(
    cycleId: string,
    data: {
      category: ServiceChecklistCategory;
      title: string;
      description?: string;
      sortOrder?: number;
    },
  ) {
    return this.prisma.serviceAdminChecklist.create({
      data: {
        serviceCycleId: cycleId,
        ...data,
      },
      include: {
        completedBy: {
          select: { id: true, fullName: true },
        },
      },
    });
  }

  // Create for current cycle
  async createForCurrentCycle(data: {
    category: ServiceChecklistCategory;
    title: string;
    description?: string;
    sortOrder?: number;
  }) {
    const cycle = await this.getCurrentActiveCycle();
    return this.create(cycle.id, data);
  }

  // Update a checklist item
  async update(
    id: string,
    data: {
      category?: ServiceChecklistCategory;
      title?: string;
      description?: string;
      notes?: string;
      sortOrder?: number;
    },
  ) {
    return this.prisma.serviceAdminChecklist.update({
      where: { id },
      data,
      include: {
        completedBy: {
          select: { id: true, fullName: true },
        },
      },
    });
  }

  // Mark item as complete
  async markComplete(id: string, userId: string, notes?: string) {
    return this.prisma.serviceAdminChecklist.update({
      where: { id },
      data: {
        isCompleted: true,
        completedById: userId,
        completedAt: new Date(),
        notes,
      },
      include: {
        completedBy: {
          select: { id: true, fullName: true },
        },
      },
    });
  }

  // Mark item as incomplete
  async markIncomplete(id: string) {
    return this.prisma.serviceAdminChecklist.update({
      where: { id },
      data: {
        isCompleted: false,
        completedById: null,
        completedAt: null,
      },
      include: {
        completedBy: {
          select: { id: true, fullName: true },
        },
      },
    });
  }

  // Delete a checklist item
  async delete(id: string) {
    return this.prisma.serviceAdminChecklist.delete({
      where: { id },
    });
  }

  // Get checklist summary for a cycle
  async getSummary(cycleId?: string) {
    let targetCycleId = cycleId;

    if (!targetCycleId) {
      const cycle = await this.getCurrentActiveCycle();
      targetCycleId = cycle.id;
    }

    const items = await this.prisma.serviceAdminChecklist.findMany({
      where: { serviceCycleId: targetCycleId },
    });

    const byCategory: Record<
      string,
      { total: number; completed: number }
    > = {};

    items.forEach((item) => {
      if (!byCategory[item.category]) {
        byCategory[item.category] = { total: 0, completed: 0 };
      }
      byCategory[item.category].total++;
      if (item.isCompleted) {
        byCategory[item.category].completed++;
      }
    });

    return {
      total: items.length,
      completed: items.filter((i) => i.isCompleted).length,
      byCategory,
    };
  }

  // Create default checklist items for a new cycle
  async createDefaultItems(cycleId: string) {
    const defaultItems = [
      { category: ServiceChecklistCategory.STAFF, title: 'קליטת סגל', sortOrder: 1 },
      { category: ServiceChecklistCategory.STAFF, title: 'תדריך פתיחה', sortOrder: 2 },
      { category: ServiceChecklistCategory.VEHICLES, title: 'קבלת רכבים', sortOrder: 1 },
      { category: ServiceChecklistCategory.VEHICLES, title: 'רישום נהגים', sortOrder: 2 },
      { category: ServiceChecklistCategory.WEAPONS, title: 'חלוקת נשקים', sortOrder: 1 },
      { category: ServiceChecklistCategory.WEAPONS, title: 'בדיקת תקינות נשקים', sortOrder: 2 },
      { category: ServiceChecklistCategory.HOTEL, title: 'חלוקת חדרים', sortOrder: 1 },
      { category: ServiceChecklistCategory.HOTEL, title: 'תיאום מול המלון', sortOrder: 2 },
      { category: ServiceChecklistCategory.LOGISTICS, title: 'קבלת ציוד', sortOrder: 1 },
      { category: ServiceChecklistCategory.LOGISTICS, title: 'חתימה על ציוד', sortOrder: 2 },
      { category: ServiceChecklistCategory.GENERAL, title: 'הקמת מטה', sortOrder: 1 },
    ];

    await this.prisma.serviceAdminChecklist.createMany({
      data: defaultItems.map((item) => ({
        serviceCycleId: cycleId,
        ...item,
      })),
    });

    return { created: defaultItems.length };
  }
}
