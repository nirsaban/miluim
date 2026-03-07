import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        armyNumber: true,
        city: true,
        dailyJob: true,
        createdAt: true,
      },
      orderBy: { fullName: 'asc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        armyNumber: true,
        idNumber: true,
        city: true,
        dailyJob: true,
        fieldOfStudy: true,
        birthDay: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('משתמש לא נמצא');
    }

    return user;
  }

  async findContacts() {
    return this.prisma.user.findMany({
      where: {
        isActive: true,
        role: {
          not: UserRole.SOLDIER,
        },
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        role: true,
        email: true,
      },
      orderBy: { role: 'asc' },
    });
  }

  async getRoles() {
    return this.prisma.role.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async updateProfile(userId: string, data: Partial<{
    phone: string;
    dailyJob: string;
    city: string;
    fieldOfStudy: string;
  }>) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        city: true,
        dailyJob: true,
        fieldOfStudy: true,
      },
    });

    return user;
  }

  async findAllSoldiersWithSkills() {
    return this.prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        armyNumber: true,
        city: true,
        dailyJob: true,
        createdAt: true,
        skills: {
          include: { skill: true },
        },
      },
      orderBy: { fullName: 'asc' },
    });
  }

  async getUserSkills(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        skills: {
          include: { skill: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('משתמש לא נמצא');
    }

    return user.skills;
  }

  async updateUserSkills(userId: string, skillIds: string[]) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('משתמש לא נמצא');
    }

    // Delete existing skills and create new ones
    await this.prisma.$transaction([
      this.prisma.soldierSkill.deleteMany({
        where: { soldierId: userId },
      }),
      ...skillIds.map((skillId) =>
        this.prisma.soldierSkill.create({
          data: {
            soldierId: userId,
            skillId,
          },
        }),
      ),
    ]);

    return this.getUserSkills(userId);
  }

  async updateUserRole(userId: string, role: UserRole) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('משתמש לא נמצא');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        fullName: true,
        role: true,
      },
    });
  }
}
