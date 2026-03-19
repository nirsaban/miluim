import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

const TEST_PASSWORD = 'Test1234!';
const ALLOWED_PERSONAL_ID = '1234567';

export interface TestUser {
  personalId: string;
  fullName: string;
  email: string;
  role: string;
  password: string;
}

@Injectable()
export class TestSetupService {
  constructor(private prisma: PrismaService) {}

  // Store original user data for rollback
  private async storeOriginalState(userIds: string[]) {
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      include: {
        skills: true,
      },
    });

    // Store in a simple way - we'll use a JSON field or create a backup table
    // For now, we'll mark users as test-modified by adding a prefix to dailyJob
    return users.map(u => ({
      id: u.id,
      isRegistered: u.isRegistered,
      passwordHash: u.passwordHash,
      departmentId: u.departmentId,
      dailyJob: u.dailyJob,
      city: u.city,
      fieldOfStudy: u.fieldOfStudy,
      birthDay: u.birthDay,
      skillIds: u.skills.map(s => s.skillId),
    }));
  }

  async runTestSetup(requestingUserPersonalId: string) {
    // Verify requesting user
    if (requestingUserPersonalId !== ALLOWED_PERSONAL_ID) {
      throw new ForbiddenException('אין לך הרשאה לפעולה זו');
    }

    const results: {
      registeredUsers: number;
      createdShifts: number;
      createdLeaves: number;
      createdMessages: number;
      sampleUsers: TestUser[];
    } = {
      registeredUsers: 0,
      createdShifts: 0,
      createdLeaves: 0,
      createdMessages: 0,
      sampleUsers: [],
    };

    // 1. Get all skills and departments
    let skills = await this.prisma.skill.findMany({ where: { isActive: true } });
    let departments = await this.prisma.department.findMany({ where: { isActive: true } });

    // Create default skills if none exist
    if (skills.length === 0) {
      const defaultSkills = [
        { name: 'DRIVER', displayName: 'נהג' },
        { name: 'MEDIC', displayName: 'חובש' },
        { name: 'RADIO', displayName: 'קשר' },
        { name: 'SNIPER', displayName: 'צלף' },
        { name: 'COMMANDER', displayName: 'מפקד' },
      ];
      for (const skill of defaultSkills) {
        await this.prisma.skill.create({ data: skill });
      }
      skills = await this.prisma.skill.findMany({ where: { isActive: true } });
    }

    // Create default department if none exist
    if (departments.length === 0) {
      await this.prisma.department.create({
        data: { name: 'פלוגה א', code: '1' },
      });
      departments = await this.prisma.department.findMany({ where: { isActive: true } });
    }

    // 2. Find all pre-approved users who haven't registered
    const unregisteredUsers = await this.prisma.user.findMany({
      where: {
        isPreApproved: true,
        isRegistered: false,
      },
    });

    // Also find registered users for assigning test data
    const allActiveUsers = await this.prisma.user.findMany({
      where: {
        isActive: true,
        role: { not: 'ADMIN' },
      },
      take: 20,
    });

    // 3. Register all unregistered users with test data
    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
    const testCities = ['תל אביב', 'ירושלים', 'חיפה', 'באר שבע', 'אילת'];
    const testJobs = ['סטודנט', 'מהנדס', 'מורה', 'רופא', 'עורך דין'];
    const testFields = ['מדעי המחשב', 'הנדסת חשמל', 'רפואה', 'משפטים', 'כלכלה'];

    for (let i = 0; i < unregisteredUsers.length; i++) {
      const user = unregisteredUsers[i];
      const randomDept = departments[Math.floor(Math.random() * departments.length)];
      const randomSkills = skills.slice(0, Math.floor(Math.random() * 3) + 1);

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          isRegistered: true,
          passwordHash,
          departmentId: randomDept.id,
          dailyJob: `[TEST] ${testJobs[i % testJobs.length]}`,
          city: testCities[i % testCities.length],
          fieldOfStudy: testFields[i % testFields.length],
          birthDay: new Date(1990 + (i % 10), i % 12, (i % 28) + 1),
          skills: {
            deleteMany: {},
            create: randomSkills.map(s => ({ skillId: s.id })),
          },
        },
      });
      results.registeredUsers++;
    }

    // 4. Ensure we have zones, tasks, and shift templates
    let zones = await this.prisma.zone.findMany({ where: { isActive: true } });
    if (zones.length === 0) {
      await this.prisma.zone.create({
        data: { name: 'שער ראשי', description: 'אזור השער הראשי' },
      });
      await this.prisma.zone.create({
        data: { name: 'היקפי', description: 'אזור היקפי' },
      });
      zones = await this.prisma.zone.findMany({ where: { isActive: true } });
    }

    let tasks = await this.prisma.task.findMany({ where: { isActive: true } });
    if (tasks.length === 0) {
      for (const zone of zones) {
        await this.prisma.task.create({
          data: {
            zoneId: zone.id,
            name: `שמירה - ${zone.name}`,
            requiredPeopleCount: 2,
          },
        });
        await this.prisma.task.create({
          data: {
            zoneId: zone.id,
            name: `סיור - ${zone.name}`,
            requiredPeopleCount: 2,
          },
        });
      }
      tasks = await this.prisma.task.findMany({ where: { isActive: true } });
    }

    let shiftTemplates = await this.prisma.shiftTemplate.findMany({ where: { isActive: true } });
    if (shiftTemplates.length === 0) {
      await this.prisma.shiftTemplate.create({
        data: { name: 'MORNING', displayName: 'בוקר', startTime: '06:00', endTime: '14:00', color: '#FCD34D', sortOrder: 1 },
      });
      await this.prisma.shiftTemplate.create({
        data: { name: 'AFTERNOON', displayName: 'צהריים', startTime: '14:00', endTime: '22:00', color: '#60A5FA', sortOrder: 2 },
      });
      await this.prisma.shiftTemplate.create({
        data: { name: 'NIGHT', displayName: 'לילה', startTime: '22:00', endTime: '06:00', color: '#818CF8', sortOrder: 3 },
      });
      shiftTemplates = await this.prisma.shiftTemplate.findMany({ where: { isActive: true } });
    }

    // 5. Create shift assignments for today and tomorrow
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const usersForShifts = [...unregisteredUsers, ...allActiveUsers].slice(0, 12);
    let shiftIndex = 0;

    for (const task of tasks.slice(0, 2)) {
      for (const template of shiftTemplates) {
        for (const date of [today, tomorrow]) {
          if (shiftIndex < usersForShifts.length) {
            const user = usersForShifts[shiftIndex];
            // Check if assignment already exists
            const existing = await this.prisma.shiftAssignment.findFirst({
              where: {
                date,
                shiftTemplateId: template.id,
                taskId: task.id,
                soldierId: user.id,
              },
            });
            if (!existing) {
              await this.prisma.shiftAssignment.create({
                data: {
                  date,
                  shiftTemplateId: template.id,
                  taskId: task.id,
                  soldierId: user.id,
                  status: 'PENDING',
                  notes: '[TEST] שיבוץ בדיקה',
                },
              });
              results.createdShifts++;
            }
            shiftIndex++;
          }
        }
      }
    }

    // 6. Create leave requests
    const leaveCategories = await this.prisma.leaveCategory.findMany({ where: { isActive: true } });
    if (leaveCategories.length === 0) {
      await this.prisma.leaveCategory.create({ data: { name: 'SHOPPING', displayName: 'קניות' } });
      await this.prisma.leaveCategory.create({ data: { name: 'MEDICAL', displayName: 'רפואי' } });
      await this.prisma.leaveCategory.create({ data: { name: 'PERSONAL', displayName: 'אישי' } });
    }
    const categories = await this.prisma.leaveCategory.findMany({ where: { isActive: true } });

    const usersForLeave = usersForShifts.slice(0, 5);
    const leaveStatuses = ['PENDING', 'APPROVED', 'ACTIVE', 'RETURNED', 'REJECTED'] as const;

    for (let i = 0; i < usersForLeave.length; i++) {
      const user = usersForLeave[i];
      const status = leaveStatuses[i];
      const exitTime = new Date();
      exitTime.setHours(exitTime.getHours() - 2);
      const expectedReturn = new Date();
      expectedReturn.setHours(expectedReturn.getHours() + 4);

      // Check if leave already exists
      const existingLeave = await this.prisma.leaveRequest.findFirst({
        where: {
          soldierId: user.id,
          reason: '[TEST] בקשת יציאה לבדיקה',
        },
      });

      if (!existingLeave) {
        await this.prisma.leaveRequest.create({
          data: {
            soldierId: user.id,
            type: i % 2 === 0 ? 'SHORT' : 'HOME',
            categoryId: categories.length > 0 ? categories[i % categories.length].id : undefined,
            reason: '[TEST] בקשת יציאה לבדיקה',
            exitTime,
            expectedReturn,
            status,
            actualReturn: status === 'RETURNED' ? new Date() : undefined,
          },
        });
        results.createdLeaves++;
      }
    }

    // 7. Create messages
    const existingTestMessage = await this.prisma.message.findFirst({
      where: { title: { contains: '[TEST]' } },
    });

    if (!existingTestMessage) {
      await this.prisma.message.create({
        data: {
          title: '[TEST] הודעה דחופה לבדיקה',
          content: 'זוהי הודעת בדיקה שדורשת אישור קריאה',
          type: 'URGENT',
          priority: 'HIGH',
          requiresConfirmation: true,
          isActive: true,
        },
      });
      await this.prisma.message.create({
        data: {
          title: '[TEST] הודעה כללית לבדיקה',
          content: 'זוהי הודעת בדיקה כללית',
          type: 'GENERAL',
          priority: 'MEDIUM',
          requiresConfirmation: false,
          isActive: true,
        },
      });
      results.createdMessages = 2;
    }

    // 8. Create or ensure active service cycle
    let activeCycle = await this.prisma.reserveServiceCycle.findFirst({
      where: { status: 'ACTIVE' },
    });

    if (!activeCycle) {
      const adminUser = await this.prisma.user.findFirst({
        where: { role: 'ADMIN' },
      });
      if (adminUser) {
        activeCycle = await this.prisma.reserveServiceCycle.create({
          data: {
            name: '[TEST] סבב בדיקה',
            description: 'סבב מילואים לבדיקת המערכת',
            startDate: today,
            endDate: tomorrow,
            status: 'ACTIVE',
            createdById: adminUser.id,
          },
        });

        // Add attendance for some users
        for (const user of usersForShifts.slice(0, 8)) {
          await this.prisma.serviceAttendance.create({
            data: {
              serviceCycleId: activeCycle.id,
              userId: user.id,
              attendanceStatus: 'ARRIVED',
              checkInAt: new Date(),
            },
          });
        }
      }
    }

    // 9. Prepare sample users for output
    const sampleUsersByRole = await this.prisma.user.findMany({
      where: {
        isActive: true,
        isRegistered: true,
        role: { in: ['SOLDIER', 'COMMANDER', 'OFFICER', 'LOGISTICS'] },
      },
      orderBy: { role: 'asc' },
      take: 20,
    });

    // Pick one of each role
    const roles = ['SOLDIER', 'COMMANDER', 'OFFICER', 'LOGISTICS'];
    const selectedUsers: TestUser[] = [];

    for (const role of roles) {
      const user = sampleUsersByRole.find(u => u.role === role && !selectedUsers.find(s => s.personalId === u.personalId));
      if (user) {
        selectedUsers.push({
          personalId: user.personalId,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          password: TEST_PASSWORD,
        });
      }
    }

    // Add one more soldier with specific scenario
    const soldierWithLeave = sampleUsersByRole.find(u =>
      u.role === 'SOLDIER' && !selectedUsers.find(s => s.personalId === u.personalId)
    );
    if (soldierWithLeave) {
      selectedUsers.push({
        personalId: soldierWithLeave.personalId,
        fullName: soldierWithLeave.fullName,
        email: soldierWithLeave.email,
        role: 'SOLDIER (with leave)',
        password: TEST_PASSWORD,
      });
    }

    results.sampleUsers = selectedUsers.slice(0, 5);

    return results;
  }

  async rollbackTestData(requestingUserPersonalId: string) {
    // Verify requesting user
    if (requestingUserPersonalId !== ALLOWED_PERSONAL_ID) {
      throw new ForbiddenException('אין לך הרשאה לפעולה זו');
    }

    const results = {
      deletedShifts: 0,
      deletedLeaves: 0,
      deletedMessages: 0,
      resetUsers: 0,
    };

    // 1. Delete test shift assignments
    const deletedShifts = await this.prisma.shiftAssignment.deleteMany({
      where: { notes: { contains: '[TEST]' } },
    });
    results.deletedShifts = deletedShifts.count;

    // 2. Delete test leave requests
    const deletedLeaves = await this.prisma.leaveRequest.deleteMany({
      where: { reason: { contains: '[TEST]' } },
    });
    results.deletedLeaves = deletedLeaves.count;

    // 3. Delete test messages and their confirmations
    const testMessages = await this.prisma.message.findMany({
      where: { title: { contains: '[TEST]' } },
    });
    for (const msg of testMessages) {
      await this.prisma.messageConfirmation.deleteMany({
        where: { messageId: msg.id },
      });
    }
    const deletedMessages = await this.prisma.message.deleteMany({
      where: { title: { contains: '[TEST]' } },
    });
    results.deletedMessages = deletedMessages.count;

    // 4. Delete test service cycle and attendance
    const testCycles = await this.prisma.reserveServiceCycle.findMany({
      where: { name: { contains: '[TEST]' } },
    });
    for (const cycle of testCycles) {
      await this.prisma.serviceAttendance.deleteMany({
        where: { serviceCycleId: cycle.id },
      });
      await this.prisma.serviceAdminChecklist.deleteMany({
        where: { serviceCycleId: cycle.id },
      });
      await this.prisma.serviceVehicle.deleteMany({
        where: { serviceCycleId: cycle.id },
      });
    }
    await this.prisma.reserveServiceCycle.deleteMany({
      where: { name: { contains: '[TEST]' } },
    });

    // 5. Reset users with [TEST] in dailyJob back to unregistered
    const testUsers = await this.prisma.user.findMany({
      where: { dailyJob: { contains: '[TEST]' } },
    });

    for (const user of testUsers) {
      await this.prisma.soldierSkill.deleteMany({
        where: { soldierId: user.id },
      });
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          isRegistered: false,
          passwordHash: '',
          dailyJob: null,
          city: null,
          fieldOfStudy: null,
          birthDay: null,
          departmentId: null,
        },
      });
      results.resetUsers++;
    }

    return results;
  }
}
