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
  scenario: string;
  password: string;
}

export interface TestSetupResult {
  registeredUsers: number;
  createdShifts: number;
  createdWorkloadShifts: number;
  createdLeaves: number;
  createdMessages: number;
  shiftOfficer: { fullName: string; personalId: string } | null;
  todayShiftsSummary: {
    morning: number;
    afternoon: number;
    night: number;
    total: number;
  };
  sampleUsers: TestUser[];
}

@Injectable()
export class TestSetupService {
  constructor(private prisma: PrismaService) {}

  async runTestSetup(requestingUserPersonalId: string): Promise<TestSetupResult> {
    // Verify requesting user
    if (requestingUserPersonalId !== ALLOWED_PERSONAL_ID) {
      throw new ForbiddenException('אין לך הרשאה לפעולה זו');
    }

    const results: TestSetupResult = {
      registeredUsers: 0,
      createdShifts: 0,
      createdWorkloadShifts: 0,
      createdLeaves: 0,
      createdMessages: 0,
      shiftOfficer: null,
      todayShiftsSummary: { morning: 0, afternoon: 0, night: 0, total: 0 },
      sampleUsers: [],
    };

    // ============================================================
    // STEP 1: Ensure base data exists (skills, departments, zones, etc.)
    // ============================================================

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

    // Create default departments if none exist
    if (departments.length === 0) {
      await this.prisma.department.create({ data: { name: 'פלוגה א', code: '1' } });
      await this.prisma.department.create({ data: { name: 'פלוגה ב', code: '2' } });
      departments = await this.prisma.department.findMany({ where: { isActive: true } });
    }

    // Ensure zones exist
    let zones = await this.prisma.zone.findMany({ where: { isActive: true } });
    if (zones.length === 0) {
      await this.prisma.zone.create({ data: { name: 'שער ראשי', description: 'אזור השער הראשי' } });
      await this.prisma.zone.create({ data: { name: 'היקפי', description: 'אזור היקפי' } });
      await this.prisma.zone.create({ data: { name: 'חמ״ל', description: 'חדר מבצעים' } });
      zones = await this.prisma.zone.findMany({ where: { isActive: true } });
    }

    // Ensure tasks exist
    let tasks = await this.prisma.task.findMany({ where: { isActive: true } });
    if (tasks.length === 0) {
      for (const zone of zones) {
        await this.prisma.task.create({
          data: { zoneId: zone.id, name: `שמירה - ${zone.name}`, requiredPeopleCount: 2 },
        });
        await this.prisma.task.create({
          data: { zoneId: zone.id, name: `סיור - ${zone.name}`, requiredPeopleCount: 2 },
        });
      }
      tasks = await this.prisma.task.findMany({ where: { isActive: true } });
    }

    // Ensure shift templates exist
    let shiftTemplates = await this.prisma.shiftTemplate.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
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
      shiftTemplates = await this.prisma.shiftTemplate.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      });
    }

    // Ensure leave categories exist
    let leaveCategories = await this.prisma.leaveCategory.findMany({ where: { isActive: true } });
    if (leaveCategories.length === 0) {
      await this.prisma.leaveCategory.create({ data: { name: 'SHOPPING', displayName: 'קניות' } });
      await this.prisma.leaveCategory.create({ data: { name: 'MEDICAL', displayName: 'רפואי' } });
      await this.prisma.leaveCategory.create({ data: { name: 'PERSONAL', displayName: 'אישי' } });
      leaveCategories = await this.prisma.leaveCategory.findMany({ where: { isActive: true } });
    }

    // ============================================================
    // STEP 2: Register all unregistered pre-approved users
    // ============================================================

    const unregisteredUsers = await this.prisma.user.findMany({
      where: { isPreApproved: true, isRegistered: false },
    });

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
    const testCities = ['תל אביב', 'ירושלים', 'חיפה', 'באר שבע', 'אילת'];
    const testJobs = ['סטודנט', 'מהנדס', 'מורה', 'רופא', 'עורך דין'];
    const testFields = ['מדעי המחשב', 'הנדסת חשמל', 'רפואה', 'משפטים', 'כלכלה'];

    for (let i = 0; i < unregisteredUsers.length; i++) {
      const user = unregisteredUsers[i];
      const randomDept = departments[i % departments.length];
      const randomSkills = skills.slice(0, (i % 3) + 1);

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

    // ============================================================
    // STEP 3: Get all active users for shift assignments
    // ============================================================

    const allActiveUsers = await this.prisma.user.findMany({
      where: { isActive: true, isRegistered: true, role: { not: 'ADMIN' } },
      orderBy: { role: 'desc' }, // Officers/Commanders first
      take: 25,
    });

    if (allActiveUsers.length < 5) {
      throw new ForbiddenException('נדרשים לפחות 5 משתמשים רשומים להרצת בדיקות');
    }

    // ============================================================
    // STEP 4: Create or get active service cycle
    // ============================================================

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    let activeCycle = await this.prisma.reserveServiceCycle.findFirst({
      where: { status: 'ACTIVE' },
    });

    const adminUser = await this.prisma.user.findFirst({ where: { role: 'ADMIN' } });

    if (!activeCycle && adminUser) {
      activeCycle = await this.prisma.reserveServiceCycle.create({
        data: {
          name: '[TEST] סבב בדיקה',
          description: 'סבב מילואים לבדיקת המערכת - כולל כל התרחישים',
          startDate: weekAgo,
          endDate: tomorrow,
          status: 'ACTIVE',
          createdById: adminUser.id,
        },
      });
    }

    // Add attendance for all users (mark as ARRIVED)
    if (activeCycle) {
      for (const user of allActiveUsers) {
        const existingAttendance = await this.prisma.serviceAttendance.findFirst({
          where: { serviceCycleId: activeCycle.id, userId: user.id },
        });
        if (!existingAttendance) {
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

    // ============================================================
    // STEP 5: Select 5 specific users for different scenarios
    // ============================================================

    // Find users by role for specific scenarios
    const officerUser = allActiveUsers.find(u => u.role === 'OFFICER') || allActiveUsers[0];
    const commanderUser = allActiveUsers.find(u => u.role === 'COMMANDER') || allActiveUsers[1];
    const soldierUsers = allActiveUsers.filter(u => u.role === 'SOLDIER');

    const shiftOfficerUser = officerUser; // The shift officer
    const soldierOnShiftUser = soldierUsers[0] || allActiveUsers[2];
    const soldierOnLeaveUser = soldierUsers[1] || allActiveUsers[3];
    const soldierWaitingShiftUser = soldierUsers[2] || allActiveUsers[4];
    const logisticsUser = allActiveUsers.find(u => u.role === 'LOGISTICS') || commanderUser;

    // ============================================================
    // STEP 6: Create today's shift schedule with shift officer
    // ============================================================

    // Delete existing test schedules for today
    await this.prisma.shiftSchedule.deleteMany({
      where: { date: today, zone: { name: { contains: 'שער' } } },
    });

    // Create schedule for today with shift officer
    const mainZone = zones.find(z => z.name.includes('שער')) || zones[0];

    const todaySchedule = await this.prisma.shiftSchedule.create({
      data: {
        date: today,
        zoneId: mainZone.id,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        publishedById: adminUser?.id,
        shiftOfficerId: shiftOfficerUser.id,
      },
    });

    results.shiftOfficer = {
      fullName: shiftOfficerUser.fullName,
      personalId: shiftOfficerUser.personalId,
    };

    // ============================================================
    // STEP 7: Create comprehensive shift assignments for today
    // ============================================================

    const morningTemplate = shiftTemplates.find(t => t.name === 'MORNING') || shiftTemplates[0];
    const afternoonTemplate = shiftTemplates.find(t => t.name === 'AFTERNOON') || shiftTemplates[1];
    const nightTemplate = shiftTemplates.find(t => t.name === 'NIGHT') || shiftTemplates[2];

    // Determine current shift based on time
    const currentHour = new Date().getHours();
    let currentTemplate = morningTemplate;
    if (currentHour >= 14 && currentHour < 22) {
      currentTemplate = afternoonTemplate;
    } else if (currentHour >= 22 || currentHour < 6) {
      currentTemplate = nightTemplate;
    }

    // Helper to create shift assignment
    const createShiftAssignment = async (
      user: typeof allActiveUsers[0],
      template: typeof shiftTemplates[0],
      task: typeof tasks[0],
      status: 'PENDING' | 'CONFIRMED' = 'PENDING',
      arrivedAt?: Date,
      batteryLevel = 0,
    ) => {
      const existing = await this.prisma.shiftAssignment.findFirst({
        where: { date: today, shiftTemplateId: template.id, soldierId: user.id },
      });
      if (!existing) {
        await this.prisma.shiftAssignment.create({
          data: {
            scheduleId: todaySchedule.id,
            date: today,
            shiftTemplateId: template.id,
            taskId: task.id,
            soldierId: user.id,
            status,
            arrivedAt,
            batteryLevel,
            notes: '[TEST] שיבוץ בדיקה',
          },
        });
        return true;
      }
      return false;
    };

    // Assign soldierOnShiftUser to CURRENT shift (confirmed, arrived)
    const guardTask = tasks.find(t => t.name.includes('שמירה')) || tasks[0];
    const patrolTask = tasks.find(t => t.name.includes('סיור')) || tasks[1];

    if (await createShiftAssignment(soldierOnShiftUser, currentTemplate, guardTask, 'CONFIRMED', new Date(), 75)) {
      results.createdShifts++;
      if (currentTemplate.name === 'MORNING') results.todayShiftsSummary.morning++;
      else if (currentTemplate.name === 'AFTERNOON') results.todayShiftsSummary.afternoon++;
      else results.todayShiftsSummary.night++;
    }

    // Assign soldierWaitingShiftUser to NEXT shift (pending)
    const nextTemplate = currentTemplate === morningTemplate ? afternoonTemplate :
                         currentTemplate === afternoonTemplate ? nightTemplate : morningTemplate;

    if (await createShiftAssignment(soldierWaitingShiftUser, nextTemplate, patrolTask, 'PENDING')) {
      results.createdShifts++;
      if (nextTemplate.name === 'MORNING') results.todayShiftsSummary.morning++;
      else if (nextTemplate.name === 'AFTERNOON') results.todayShiftsSummary.afternoon++;
      else results.todayShiftsSummary.night++;
    }

    // Add more soldiers to current shift (some arrived, some pending)
    let additionalSoldierIndex = 0;
    for (const template of [morningTemplate, afternoonTemplate, nightTemplate]) {
      for (const task of tasks.slice(0, 2)) {
        for (let i = 0; i < 2; i++) {
          const soldier = soldierUsers[additionalSoldierIndex + 3] || allActiveUsers[(additionalSoldierIndex + 5) % allActiveUsers.length];
          if (soldier && soldier.id !== soldierOnShiftUser.id &&
              soldier.id !== soldierOnLeaveUser.id &&
              soldier.id !== soldierWaitingShiftUser.id &&
              soldier.id !== shiftOfficerUser.id) {

            const isCurrentShift = template.id === currentTemplate.id;
            const arrived = isCurrentShift && Math.random() > 0.3;

            if (await createShiftAssignment(
              soldier,
              template,
              task,
              arrived ? 'CONFIRMED' : 'PENDING',
              arrived ? new Date() : undefined,
              arrived ? Math.floor(Math.random() * 4) * 25 + 25 : 0
            )) {
              results.createdShifts++;
              if (template.name === 'MORNING') results.todayShiftsSummary.morning++;
              else if (template.name === 'AFTERNOON') results.todayShiftsSummary.afternoon++;
              else results.todayShiftsSummary.night++;
            }
            additionalSoldierIndex++;
          }
        }
      }
    }

    results.todayShiftsSummary.total = results.todayShiftsSummary.morning +
                                        results.todayShiftsSummary.afternoon +
                                        results.todayShiftsSummary.night;

    // ============================================================
    // STEP 8: Create HISTORICAL shifts for workload analytics
    // ============================================================

    for (let daysAgo = 1; daysAgo <= 7; daysAgo++) {
      const pastDate = new Date(today);
      pastDate.setDate(pastDate.getDate() - daysAgo);

      for (const soldier of soldierUsers.slice(0, 8)) {
        // Each soldier had 1-2 shifts per day
        const shiftsPerDay = (daysAgo % 2) + 1;
        for (let s = 0; s < shiftsPerDay; s++) {
          const template = shiftTemplates[(daysAgo + s) % shiftTemplates.length];
          const task = tasks[(daysAgo + s) % tasks.length];

          const existing = await this.prisma.shiftAssignment.findFirst({
            where: { date: pastDate, shiftTemplateId: template.id, soldierId: soldier.id },
          });

          if (!existing) {
            await this.prisma.shiftAssignment.create({
              data: {
                date: pastDate,
                shiftTemplateId: template.id,
                taskId: task.id,
                soldierId: soldier.id,
                status: 'COMPLETED',
                arrivedAt: pastDate,
                batteryLevel: 100,
                notes: '[TEST] שיבוץ היסטורי לבדיקת עומסים',
              },
            });
            results.createdWorkloadShifts++;
          }
        }
      }
    }

    // ============================================================
    // STEP 9: Create leave requests with different statuses
    // ============================================================

    // Active leave for soldierOnLeaveUser
    const exitTime = new Date();
    exitTime.setHours(exitTime.getHours() - 1);
    const expectedReturn = new Date();
    expectedReturn.setHours(expectedReturn.getHours() + 3);

    const existingActiveLeave = await this.prisma.leaveRequest.findFirst({
      where: { soldierId: soldierOnLeaveUser.id, status: 'ACTIVE' },
    });

    if (!existingActiveLeave) {
      await this.prisma.leaveRequest.create({
        data: {
          soldierId: soldierOnLeaveUser.id,
          type: 'SHORT',
          categoryId: leaveCategories[0]?.id,
          reason: '[TEST] יציאה לקניות - פעילה',
          exitTime,
          expectedReturn,
          status: 'ACTIVE',
        },
      });
      results.createdLeaves++;
    }

    // Pending leave request
    const pendingLeaveUser = soldierUsers[5] || allActiveUsers[6];
    if (pendingLeaveUser) {
      const existingPending = await this.prisma.leaveRequest.findFirst({
        where: { soldierId: pendingLeaveUser.id, reason: { contains: '[TEST]' }, status: 'PENDING' },
      });
      if (!existingPending) {
        await this.prisma.leaveRequest.create({
          data: {
            soldierId: pendingLeaveUser.id,
            type: 'HOME',
            reason: '[TEST] בקשה ליציאה הביתה - ממתינה לאישור',
            exitTime: new Date(),
            expectedReturn: new Date(Date.now() + 24 * 60 * 60 * 1000),
            status: 'PENDING',
          },
        });
        results.createdLeaves++;
      }
    }

    // Overdue leave (past expected return)
    const overdueUser = soldierUsers[6] || allActiveUsers[7];
    if (overdueUser) {
      const overdueExit = new Date();
      overdueExit.setHours(overdueExit.getHours() - 5);
      const overdueExpected = new Date();
      overdueExpected.setHours(overdueExpected.getHours() - 1); // Past!

      const existingOverdue = await this.prisma.leaveRequest.findFirst({
        where: { soldierId: overdueUser.id, reason: { contains: '[TEST]' }, status: 'ACTIVE' },
      });
      if (!existingOverdue) {
        await this.prisma.leaveRequest.create({
          data: {
            soldierId: overdueUser.id,
            type: 'SHORT',
            categoryId: leaveCategories[1]?.id,
            reason: '[TEST] יציאה רפואית - באיחור!',
            exitTime: overdueExit,
            expectedReturn: overdueExpected,
            status: 'ACTIVE',
          },
        });
        results.createdLeaves++;
      }
    }

    // ============================================================
    // STEP 10: Create messages requiring confirmation
    // ============================================================

    const existingTestMessage = await this.prisma.message.findFirst({
      where: { title: { contains: '[TEST]' } },
    });

    if (!existingTestMessage) {
      await this.prisma.message.create({
        data: {
          title: '[TEST] הודעה דחופה - חובה לאשר קריאה',
          content: 'הודעה זו נשלחה כחלק מבדיקת המערכת. יש לאשר קריאה.',
          type: 'URGENT',
          priority: 'CRITICAL',
          requiresConfirmation: true,
          isActive: true,
          createdById: adminUser?.id,
        },
      });
      await this.prisma.message.create({
        data: {
          title: '[TEST] עדכון שגרתי',
          content: 'זוהי הודעה כללית לבדיקת המערכת. אין צורך באישור.',
          type: 'GENERAL',
          priority: 'MEDIUM',
          requiresConfirmation: false,
          isActive: true,
          createdById: adminUser?.id,
        },
      });
      await this.prisma.message.create({
        data: {
          title: '[TEST] עדכון ארוחות',
          content: 'ארוחת צהריים: 12:00-14:00\nארוחת ערב: 18:00-20:00',
          type: 'FOOD',
          priority: 'LOW',
          requiresConfirmation: false,
          isActive: true,
          createdById: adminUser?.id,
        },
      });
      results.createdMessages = 3;
    }

    // ============================================================
    // STEP 11: Build the 5 sample users with scenarios
    // ============================================================

    results.sampleUsers = [
      {
        personalId: shiftOfficerUser.personalId,
        fullName: shiftOfficerUser.fullName,
        email: shiftOfficerUser.email,
        role: shiftOfficerUser.role,
        scenario: 'קצין תורן היום - יכול לנהל משמרות ולאשר הגעות',
        password: TEST_PASSWORD,
      },
      {
        personalId: soldierOnShiftUser.personalId,
        fullName: soldierOnShiftUser.fullName,
        email: soldierOnShiftUser.email,
        role: soldierOnShiftUser.role,
        scenario: `במשמרת עכשיו (${currentTemplate.displayName}) - אישר הגעה, סוללה 75%`,
        password: TEST_PASSWORD,
      },
      {
        personalId: soldierOnLeaveUser.personalId,
        fullName: soldierOnLeaveUser.fullName,
        email: soldierOnLeaveUser.email,
        role: soldierOnLeaveUser.role,
        scenario: 'ביציאה קצרה (קניות) - סטטוס פעיל',
        password: TEST_PASSWORD,
      },
      {
        personalId: soldierWaitingShiftUser.personalId,
        fullName: soldierWaitingShiftUser.fullName,
        email: soldierWaitingShiftUser.email,
        role: soldierWaitingShiftUser.role,
        scenario: `ממתין למשמרת הבאה (${nextTemplate.displayName})`,
        password: TEST_PASSWORD,
      },
      {
        personalId: commanderUser.personalId,
        fullName: commanderUser.fullName,
        email: commanderUser.email,
        role: commanderUser.role,
        scenario: 'מפקד - יכול לראות בקשות יציאה ולקבל התראות פיקוד',
        password: TEST_PASSWORD,
      },
    ];

    return results;
  }

  async rollbackTestData(requestingUserPersonalId: string) {
    // Verify requesting user
    if (requestingUserPersonalId !== ALLOWED_PERSONAL_ID) {
      throw new ForbiddenException('אין לך הרשאה לפעולה זו');
    }

    const results = {
      deletedShifts: 0,
      deletedSchedules: 0,
      deletedLeaves: 0,
      deletedMessages: 0,
      deletedServiceCycles: 0,
      resetUsers: 0,
    };

    // 1. Delete test shift assignments (both regular and workload)
    const deletedShifts = await this.prisma.shiftAssignment.deleteMany({
      where: { notes: { contains: '[TEST]' } },
    });
    results.deletedShifts = deletedShifts.count;

    // 2. Delete test shift schedules
    const testSchedules = await this.prisma.shiftSchedule.findMany({
      where: {
        OR: [
          { shiftOfficer: { dailyJob: { contains: '[TEST]' } } },
          { publishedBy: { role: 'ADMIN' }, date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        ]
      },
    });
    // Only delete schedules that have no non-test assignments
    for (const schedule of testSchedules) {
      const nonTestAssignments = await this.prisma.shiftAssignment.count({
        where: { scheduleId: schedule.id, notes: { not: { contains: '[TEST]' } } },
      });
      if (nonTestAssignments === 0) {
        await this.prisma.shiftSchedule.delete({ where: { id: schedule.id } });
        results.deletedSchedules++;
      }
    }

    // 3. Delete test leave requests
    const deletedLeaves = await this.prisma.leaveRequest.deleteMany({
      where: { reason: { contains: '[TEST]' } },
    });
    results.deletedLeaves = deletedLeaves.count;

    // 4. Delete test messages and their confirmations
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

    // 5. Delete test service cycle and attendance
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
    const deletedCycles = await this.prisma.reserveServiceCycle.deleteMany({
      where: { name: { contains: '[TEST]' } },
    });
    results.deletedServiceCycles = deletedCycles.count;

    // 6. Reset users with [TEST] in dailyJob back to unregistered
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
