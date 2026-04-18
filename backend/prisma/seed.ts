
import {
  PrismaClient,
  UserRole,
  MilitaryRole,
  MessageType,
  MessagePriority,
  MessageTargetAudience,
  ShiftType,
  ReserveServiceCycleStatus,
  ServiceAttendanceStatus,
  ServiceChecklistCategory,
  SocialActivityStatus,
  EmergencyEventStatus,
  LeaveType,
  LeaveStatus,
  ShiftScheduleStatus,
  ShiftAssignmentStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ============================================================
// HELPERS
// ============================================================

const hashPassword = (pw: string) => bcrypt.hash(pw, 10);

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

function hoursFromNow(n: number): Date {
  return new Date(Date.now() + n * 60 * 60 * 1000);
}

function dateOnly(d: Date): Date {
  return new Date(d.toISOString().slice(0, 10));
}

const today = dateOnly(new Date());

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('🌱 Starting full database seed...\n');

  // ----------------------------------------------------------
  // 1. BATTALION
  // ----------------------------------------------------------
  console.log('🏛️  Creating battalion...');
  const battalion = await prisma.battalion.upsert({
    where: { id: 'seed-battalion' },
    update: {},
    create: {
      id: 'seed-battalion',
      name: 'גדוד 932',
      description: 'גדוד מילואים 932 - חטיבת הנגב',
    },
  });
  console.log(`   ✅ ${battalion.name}`);

  // ----------------------------------------------------------
  // 2. COMPANIES (2 companies under the battalion)
  // ----------------------------------------------------------
  console.log('\n🏢 Creating companies...');
  const companyA = await prisma.company.upsert({
    where: { id: 'seed-company-a' },
    update: {},
    create: {
      id: 'seed-company-a',
      battalionId: battalion.id,
      name: "פלוגה א'",
      code: 'A',
      description: "פלוגת לחימה א'",
    },
  });
  console.log(`   ✅ ${companyA.name} (${companyA.code})`);

  const companyB = await prisma.company.upsert({
    where: { id: 'seed-company-b' },
    update: {},
    create: {
      id: 'seed-company-b',
      battalionId: battalion.id,
      name: "פלוגה ב'",
      code: 'B',
      description: "פלוגת לחימה ב'",
    },
  });
  console.log(`   ✅ ${companyB.name} (${companyB.code})`);

  // ----------------------------------------------------------
  // 3. DEPARTMENTS (per company)
  // ----------------------------------------------------------
  console.log('\n📦 Creating departments...');
  const deptA1 = await upsertDepartment('seed-dept-a1', 'מחלקה 1', '1', companyA.id);
  const deptA2 = await upsertDepartment('seed-dept-a2', 'מחלקה 2', '2', companyA.id);
  const deptA3 = await upsertDepartment('seed-dept-a3', 'מחלקה 3', '3', companyA.id);
  const deptA0 = await upsertDepartment('seed-dept-a0', 'סגל ומטה', '0', companyA.id);
  const deptB1 = await upsertDepartment('seed-dept-b1', 'מחלקה 1', '1', companyB.id);
  const deptB2 = await upsertDepartment('seed-dept-b2', 'מחלקה 2', '2', companyB.id);
  const deptB0 = await upsertDepartment('seed-dept-b0', 'סגל ומטה', '0', companyB.id);

  // ----------------------------------------------------------
  // 4. LEGACY ROLES
  // ----------------------------------------------------------
  console.log('\n📋 Creating legacy roles...');
  const roles = [
    { name: 'SOLDIER', displayName: 'חייל' },
    { name: 'COMMANDER', displayName: 'מפקד' },
    { name: 'OFFICER', displayName: 'קצין' },
    { name: 'MEDIC', displayName: 'חובש' },
    { name: 'LOGISTICS', displayName: 'לוגיסטיקה' },
    { name: 'ADMIN', displayName: 'מנהל מערכת' },
  ];
  for (const role of roles) {
    await prisma.role.upsert({ where: { name: role.name }, update: {}, create: role });
  }
  console.log('   ✅ Legacy roles created');

  // ----------------------------------------------------------
  // 5. USERS
  // ----------------------------------------------------------
  console.log('\n👥 Creating users...');
  const pw = await hashPassword('Yogev2024!');
  const sysPw = await hashPassword('parnasa2026S!');

  // Battalion Admin (מפקד גדוד)
  const battalionAdmin = await upsertUser({
    id: 'seed-user-bat-admin',
    personalId: '1000000',
    fullName: 'אלוף יוסי כהן',
    email: 'battalion@yogev.idf',
    phone: '0501234567',
    passwordHash: pw,
    role: UserRole.BATTALION_ADMIN,
    militaryRole: MilitaryRole.PLATOON_COMMANDER,
    departmentId: deptA0.id,
    companyId: companyA.id,
    battalionId: battalion.id,
    idNumber: '100000001',
    armyNumber: '1000000',
  });
  console.log(`   ✅ מפקד גדוד: ${battalionAdmin.fullName} (${battalionAdmin.personalId}) / Yogev2024!`);

  // System Technical
  const systemTech = await upsertUser({
    id: 'seed-user-sys-tech',
    personalId: '060196',
    fullName: 'System Technical',
    email: 'system@yogev.idf',
    phone: '0500000000',
    passwordHash: sysPw,
    role: UserRole.SYSTEM_TECHNICAL,
    militaryRole: MilitaryRole.FIGHTER,
    departmentId: deptA0.id,
    companyId: companyA.id,
    battalionId: null,
    idNumber: '060196000',
    armyNumber: '060196',
  });
  console.log(`   ✅ System Technical: ${systemTech.personalId} / parnasa2026S!`);

  // Company A Admin (מפקד פלוגה א')
  const companyAAdmin = await upsertUser({
    id: 'seed-user-admin-a',
    personalId: '2000001',
    fullName: 'סרן דני לוי',
    email: 'admin.a@yogev.idf',
    phone: '0502000001',
    passwordHash: pw,
    role: UserRole.ADMIN,
    militaryRole: MilitaryRole.PLATOON_COMMANDER,
    departmentId: deptA0.id,
    companyId: companyA.id,
    battalionId: null,
    idNumber: '200000001',
    armyNumber: '2000001',
  });
  console.log(`   ✅ מפקד פלוגה א': ${companyAAdmin.fullName} (${companyAAdmin.personalId})`);

  // Company B Admin (מפקד פלוגה ב')
  const companyBAdmin = await upsertUser({
    id: 'seed-user-admin-b',
    personalId: '2000002',
    fullName: 'סרן מיכאל אברהם',
    email: 'admin.b@yogev.idf',
    phone: '0502000002',
    passwordHash: pw,
    role: UserRole.ADMIN,
    militaryRole: MilitaryRole.PLATOON_COMMANDER,
    departmentId: deptB0.id,
    companyId: companyB.id,
    battalionId: null,
    idNumber: '200000002',
    armyNumber: '2000002',
  });
  console.log(`   ✅ מפקד פלוגה ב': ${companyBAdmin.fullName} (${companyBAdmin.personalId})`);

  // Company A — Officer (קצין מחלקה)
  const officerA = await upsertUser({
    id: 'seed-user-officer-a',
    personalId: '3000001',
    fullName: 'סגן רון ישראלי',
    email: 'officer.a@yogev.idf',
    phone: '0503000001',
    passwordHash: pw,
    role: UserRole.OFFICER,
    militaryRole: MilitaryRole.DUTY_OFFICER,
    departmentId: deptA1.id,
    companyId: companyA.id,
    battalionId: null,
    idNumber: '300000001',
    armyNumber: '3000001',
  });
  console.log(`   ✅ קצין מחלקה א': ${officerA.fullName} (${officerA.personalId})`);

  // Company A — Logistics
  const logisticsA = await upsertUser({
    id: 'seed-user-logistics-a',
    personalId: '3000002',
    fullName: 'סמל רועי מזרחי',
    email: 'logistics.a@yogev.idf',
    phone: '0503000002',
    passwordHash: pw,
    role: UserRole.LOGISTICS,
    militaryRole: MilitaryRole.OPERATIONS_SGT,
    departmentId: deptA0.id,
    companyId: companyA.id,
    battalionId: null,
    idNumber: '300000002',
    armyNumber: '3000002',
  });
  console.log(`   ✅ לוגיסטיקה א': ${logisticsA.fullName} (${logisticsA.personalId})`);

  // Company A — Commander
  const commanderA = await upsertUser({
    id: 'seed-user-cmd-a',
    personalId: '4000001',
    fullName: 'סמל אבי גולן',
    email: 'commander.a@yogev.idf',
    phone: '0504000001',
    passwordHash: pw,
    role: UserRole.COMMANDER,
    militaryRole: MilitaryRole.SQUAD_COMMANDER,
    departmentId: deptA1.id,
    companyId: companyA.id,
    battalionId: null,
    idNumber: '400000001',
    armyNumber: '4000001',
  });
  console.log(`   ✅ מפקד כיתה א': ${commanderA.fullName} (${commanderA.personalId})`);

  // Company A — Soldiers (6 soldiers across departments)
  const soldiersA = [];
  const soldierNamesA = [
    { name: 'יוסי ברקוביץ', dept: deptA1.id },
    { name: 'אורי שמש', dept: deptA1.id },
    { name: 'עמית דגן', dept: deptA2.id },
    { name: 'גיל חן', dept: deptA2.id },
    { name: 'נועם פרץ', dept: deptA3.id },
    { name: 'אלון רוזנברג', dept: deptA3.id },
  ];

  for (let i = 0; i < soldierNamesA.length; i++) {
    const s = await upsertUser({
      id: `seed-user-soldier-a${i + 1}`,
      personalId: `500000${i + 1}`,
      fullName: soldierNamesA[i].name,
      email: `soldier.a${i + 1}@yogev.idf`,
      phone: `050500000${i + 1}`,
      passwordHash: pw,
      role: UserRole.SOLDIER,
      militaryRole: MilitaryRole.FIGHTER,
      departmentId: soldierNamesA[i].dept,
      companyId: companyA.id,
      battalionId: null,
      idNumber: `50000000${i + 1}`,
      armyNumber: `500000${i + 1}`,
    });
    soldiersA.push(s);
  }
  console.log(`   ✅ ${soldiersA.length} חיילים בפלוגה א'`);

  // Company B — Soldiers (4 soldiers)
  const soldiersB = [];
  const soldierNamesB = [
    { name: 'תומר שלום', dept: deptB1.id },
    { name: 'דור אילן', dept: deptB1.id },
    { name: 'יונתן לב', dept: deptB2.id },
    { name: 'איתי סער', dept: deptB2.id },
  ];

  for (let i = 0; i < soldierNamesB.length; i++) {
    const s = await upsertUser({
      id: `seed-user-soldier-b${i + 1}`,
      personalId: `600000${i + 1}`,
      fullName: soldierNamesB[i].name,
      email: `soldier.b${i + 1}@yogev.idf`,
      phone: `050600000${i + 1}`,
      passwordHash: pw,
      role: UserRole.SOLDIER,
      militaryRole: MilitaryRole.FIGHTER,
      departmentId: soldierNamesB[i].dept,
      companyId: companyB.id,
      battalionId: null,
      idNumber: `60000000${i + 1}`,
      armyNumber: `600000${i + 1}`,
    });
    soldiersB.push(s);
  }
  console.log(`   ✅ ${soldiersB.length} חיילים בפלוגה ב'`);

  // ----------------------------------------------------------
  // 6. SKILLS (per company)
  // ----------------------------------------------------------
  console.log('\n🎯 Creating skills...');
  const skillDefs = [
    { name: 'COMMANDER', displayName: 'מפקד' },
    { name: 'DRIVER', displayName: 'נהג' },
    { name: 'FIGHTER', displayName: 'לוחם' },
    { name: 'SFOGIST', displayName: 'ספוגיסט' },
    { name: 'MEDIC', displayName: 'חובש' },
    { name: 'RADIO', displayName: 'קשר' },
    { name: 'NAVIGATOR', displayName: 'נווט' },
  ];

  const skillsA: any[] = [];
  for (const sk of skillDefs) {
    const skill = await prisma.skill.upsert({
      where: { companyId_name: { companyId: companyA.id, name: sk.name } },
      update: {},
      create: { ...sk, companyId: companyA.id },
    });
    skillsA.push(skill);
  }
  // Also for company B
  for (const sk of skillDefs) {
    await prisma.skill.upsert({
      where: { companyId_name: { companyId: companyB.id, name: sk.name } },
      update: {},
      create: { ...sk, companyId: companyB.id },
    });
  }
  console.log('   ✅ Skills created for both companies');

  // Assign skills to some soldiers
  const fighterSkill = skillsA.find((s) => s.name === 'FIGHTER');
  const driverSkill = skillsA.find((s) => s.name === 'DRIVER');
  const medicSkill = skillsA.find((s) => s.name === 'MEDIC');
  if (fighterSkill) {
    for (const s of soldiersA.slice(0, 4)) {
      await prisma.soldierSkill.upsert({
        where: { soldierId_skillId: { soldierId: s.id, skillId: fighterSkill.id } },
        update: {},
        create: { soldierId: s.id, skillId: fighterSkill.id },
      });
    }
  }
  if (driverSkill) {
    await prisma.soldierSkill.upsert({
      where: { soldierId_skillId: { soldierId: soldiersA[0].id, skillId: driverSkill.id } },
      update: {},
      create: { soldierId: soldiersA[0].id, skillId: driverSkill.id },
    });
  }
  if (medicSkill) {
    await prisma.soldierSkill.upsert({
      where: { soldierId_skillId: { soldierId: soldiersA[4].id, skillId: medicSkill.id } },
      update: {},
      create: { soldierId: soldiersA[4].id, skillId: medicSkill.id },
    });
  }
  console.log('   ✅ Soldier skills assigned');

  // ----------------------------------------------------------
  // 7. ZONES & TASKS (Company A)
  // ----------------------------------------------------------
  console.log('\n📍 Creating zones and tasks...');
  const zoneGate = await prisma.zone.upsert({
    where: { companyId_name: { companyId: companyA.id, name: 'שער ראשי' } },
    update: {},
    create: { name: 'שער ראשי', description: 'שער כניסה ראשי לבסיס', companyId: companyA.id },
  });
  const zonePerimeter = await prisma.zone.upsert({
    where: { companyId_name: { companyId: companyA.id, name: 'היקפי' } },
    update: {},
    create: { name: 'היקפי', description: 'שמירה היקפית', companyId: companyA.id },
  });
  const zoneTower = await prisma.zone.upsert({
    where: { companyId_name: { companyId: companyA.id, name: 'מגדל תצפית' } },
    update: {},
    create: { name: 'מגדל תצפית', description: 'תצפית ושמירה', companyId: companyA.id },
  });
  console.log('   ✅ 3 zones created');

  // Tasks
  const taskGateGuard = await prisma.task.upsert({
    where: { id: 'seed-task-gate-guard' },
    update: {},
    create: { id: 'seed-task-gate-guard', zoneId: zoneGate.id, name: 'שמירה בשער', type: ShiftType.GUARD, requiredPeopleCount: 2 },
  });
  const taskPerimeterPatrol = await prisma.task.upsert({
    where: { id: 'seed-task-perimeter' },
    update: {},
    create: { id: 'seed-task-perimeter', zoneId: zonePerimeter.id, name: 'סיור היקפי', type: ShiftType.PATROL, requiredPeopleCount: 2 },
  });
  const taskTower = await prisma.task.upsert({
    where: { id: 'seed-task-tower' },
    update: {},
    create: { id: 'seed-task-tower', zoneId: zoneTower.id, name: 'תצפית', type: ShiftType.GUARD, requiredPeopleCount: 1 },
  });
  console.log('   ✅ 3 tasks created');

  // Task checklist items
  await prisma.taskChecklistItem.upsert({
    where: { id: 'seed-checklist-1' },
    update: {},
    create: { id: 'seed-checklist-1', taskId: taskGateGuard.id, label: 'בדיקת מצב מחסום', sortOrder: 1 },
  });
  await prisma.taskChecklistItem.upsert({
    where: { id: 'seed-checklist-2' },
    update: {},
    create: { id: 'seed-checklist-2', taskId: taskGateGuard.id, label: 'בדיקת תאורה', sortOrder: 2 },
  });
  await prisma.taskChecklistItem.upsert({
    where: { id: 'seed-checklist-3' },
    update: {},
    create: { id: 'seed-checklist-3', taskId: taskPerimeterPatrol.id, label: 'בדיקת גדר', sortOrder: 1 },
  });
  console.log('   ✅ Task checklist items created');

  // ----------------------------------------------------------
  // 8. SHIFT TEMPLATES (per company)
  // ----------------------------------------------------------
  console.log('\n⏰ Creating shift templates...');
  const shiftTemplates = [
    { name: 'MORNING', displayName: 'בוקר', startTime: '06:00', endTime: '14:00', color: '#FCD34D', sortOrder: 1 },
    { name: 'EVENING', displayName: 'ערב', startTime: '14:00', endTime: '22:00', color: '#F97316', sortOrder: 2 },
    { name: 'NIGHT', displayName: 'לילה', startTime: '22:00', endTime: '06:00', color: '#6366F1', sortOrder: 3 },
  ];

  const templatesA: any[] = [];
  for (const t of shiftTemplates) {
    const template = await prisma.shiftTemplate.upsert({
      where: { companyId_name: { companyId: companyA.id, name: t.name } },
      update: {},
      create: { ...t, companyId: companyA.id },
    });
    templatesA.push(template);
  }
  for (const t of shiftTemplates) {
    await prisma.shiftTemplate.upsert({
      where: { companyId_name: { companyId: companyB.id, name: t.name } },
      update: {},
      create: { ...t, companyId: companyB.id },
    });
  }
  console.log('   ✅ Shift templates created for both companies');

  // ----------------------------------------------------------
  // 9. SHIFT SCHEDULE + ASSIGNMENTS (today, Company A)
  // ----------------------------------------------------------
  console.log('\n📅 Creating shift schedule & assignments (today)...');
  const scheduleToday = await prisma.shiftSchedule.upsert({
    where: { companyId_date_zoneId: { companyId: companyA.id, date: today, zoneId: zoneGate.id } },
    update: {},
    create: {
      date: today,
      zoneId: zoneGate.id,
      companyId: companyA.id,
      status: ShiftScheduleStatus.PUBLISHED,
      publishedAt: new Date(),
      publishedById: companyAAdmin.id,
      shiftOfficerId: officerA.id,
    },
  });

  // Morning shift — 2 soldiers at gate
  for (let i = 0; i < 2; i++) {
    await prisma.shiftAssignment.upsert({
      where: {
        date_shiftTemplateId_taskId_soldierId: {
          date: today,
          shiftTemplateId: templatesA[0].id,
          taskId: taskGateGuard.id,
          soldierId: soldiersA[i].id,
        },
      },
      update: {},
      create: {
        scheduleId: scheduleToday.id,
        date: today,
        shiftTemplateId: templatesA[0].id,
        taskId: taskGateGuard.id,
        soldierId: soldiersA[i].id,
        status: i === 0 ? ShiftAssignmentStatus.CONFIRMED : ShiftAssignmentStatus.PENDING,
        arrivedAt: i === 0 ? new Date() : null,
        batteryLevel: i === 0 ? 85 : 0,
      },
    });
  }

  // Evening shift — 2 soldiers on perimeter
  const schedulePerimeter = await prisma.shiftSchedule.upsert({
    where: { companyId_date_zoneId: { companyId: companyA.id, date: today, zoneId: zonePerimeter.id } },
    update: {},
    create: {
      date: today,
      zoneId: zonePerimeter.id,
      companyId: companyA.id,
      status: ShiftScheduleStatus.PUBLISHED,
      publishedAt: new Date(),
      publishedById: companyAAdmin.id,
      shiftOfficerId: officerA.id,
    },
  });

  for (let i = 2; i < 4; i++) {
    await prisma.shiftAssignment.upsert({
      where: {
        date_shiftTemplateId_taskId_soldierId: {
          date: today,
          shiftTemplateId: templatesA[1].id,
          taskId: taskPerimeterPatrol.id,
          soldierId: soldiersA[i].id,
        },
      },
      update: {},
      create: {
        scheduleId: schedulePerimeter.id,
        date: today,
        shiftTemplateId: templatesA[1].id,
        taskId: taskPerimeterPatrol.id,
        soldierId: soldiersA[i].id,
        status: ShiftAssignmentStatus.PENDING,
      },
    });
  }

  // Night shift — 1 soldier in tower
  await prisma.shiftAssignment.upsert({
    where: {
      date_shiftTemplateId_taskId_soldierId: {
        date: today,
        shiftTemplateId: templatesA[2].id,
        taskId: taskTower.id,
        soldierId: soldiersA[4].id,
      },
    },
    update: {},
    create: {
      scheduleId: schedulePerimeter.id,
      date: today,
      shiftTemplateId: templatesA[2].id,
      taskId: taskTower.id,
      soldierId: soldiersA[4].id,
      status: ShiftAssignmentStatus.PENDING,
    },
  });

  console.log('   ✅ 5 shift assignments created (morning gate, evening perimeter, night tower)');

  // ----------------------------------------------------------
  // 10. LEAVE CATEGORIES (per company)
  // ----------------------------------------------------------
  console.log('\n📅 Creating leave categories...');
  const leaveCatDefs = [
    { name: 'FOOD', displayName: 'אוכל', icon: 'Utensils' },
    { name: 'GYM', displayName: 'חדר כושר', icon: 'Dumbbell' },
    { name: 'SHOPPING', displayName: 'קניות', icon: 'ShoppingBag' },
    { name: 'PERSONAL', displayName: 'עניינים אישיים', icon: 'User' },
    { name: 'MEDICAL', displayName: 'רפואי', icon: 'Stethoscope' },
    { name: 'OTHER', displayName: 'אחר', icon: 'MoreHorizontal' },
  ];

  const leaveCatsA: any[] = [];
  for (const lc of leaveCatDefs) {
    const cat = await prisma.leaveCategory.upsert({
      where: { companyId_name: { companyId: companyA.id, name: lc.name } },
      update: {},
      create: { ...lc, companyId: companyA.id },
    });
    leaveCatsA.push(cat);
  }
  for (const lc of leaveCatDefs) {
    await prisma.leaveCategory.upsert({
      where: { companyId_name: { companyId: companyB.id, name: lc.name } },
      update: {},
      create: { ...lc, companyId: companyB.id },
    });
  }
  console.log('   ✅ Leave categories created for both companies');

  // ----------------------------------------------------------
  // 11. LEAVE REQUESTS (various statuses)
  // ----------------------------------------------------------
  console.log('\n📋 Creating leave requests...');
  const foodCat = leaveCatsA.find((c) => c.name === 'FOOD');
  const personalCat = leaveCatsA.find((c) => c.name === 'PERSONAL');
  const medicalCat = leaveCatsA.find((c) => c.name === 'MEDICAL');

  // Pending leave
  await prisma.leaveRequest.upsert({
    where: { id: 'seed-leave-pending' },
    update: {},
    create: {
      id: 'seed-leave-pending',
      soldierId: soldiersA[0].id,
      type: LeaveType.SHORT,
      categoryId: foodCat?.id,
      reason: 'ארוחת צהריים בעיר',
      exitTime: hoursFromNow(2),
      expectedReturn: hoursFromNow(4),
      status: LeaveStatus.PENDING,
    },
  });

  // Approved/Active leave
  await prisma.leaveRequest.upsert({
    where: { id: 'seed-leave-active' },
    update: {},
    create: {
      id: 'seed-leave-active',
      soldierId: soldiersA[2].id,
      type: LeaveType.SHORT,
      categoryId: personalCat?.id,
      reason: 'עניינים אישיים בעיר',
      exitTime: hoursFromNow(-1),
      expectedReturn: hoursFromNow(1),
      status: LeaveStatus.ACTIVE,
      approvedById: officerA.id,
    },
  });

  // Overdue leave
  await prisma.leaveRequest.upsert({
    where: { id: 'seed-leave-overdue' },
    update: {},
    create: {
      id: 'seed-leave-overdue',
      soldierId: soldiersA[3].id,
      type: LeaveType.SHORT,
      categoryId: medicalCat?.id,
      reason: 'ביקור רופא',
      exitTime: hoursFromNow(-5),
      expectedReturn: hoursFromNow(-2),
      status: LeaveStatus.OVERDUE,
      approvedById: officerA.id,
    },
  });

  // Home leave (returned)
  await prisma.leaveRequest.upsert({
    where: { id: 'seed-leave-returned' },
    update: {},
    create: {
      id: 'seed-leave-returned',
      soldierId: soldiersA[1].id,
      type: LeaveType.HOME,
      reason: 'שבתון',
      exitTime: daysFromNow(-3),
      expectedReturn: daysFromNow(-1),
      actualReturn: daysFromNow(-1),
      status: LeaveStatus.RETURNED,
      approvedById: companyAAdmin.id,
    },
  });

  console.log('   ✅ 4 leave requests (pending, active, overdue, returned)');

  // ----------------------------------------------------------
  // 12. RESERVE SERVICE CYCLE (Company A — active, Company B — planned)
  // ----------------------------------------------------------
  console.log('\n🎖️  Creating reserve service cycles...');

  const cycleA = await prisma.reserveServiceCycle.upsert({
    where: { id: 'seed-cycle-a' },
    update: {},
    create: {
      id: 'seed-cycle-a',
      name: 'סבב אביב 2026',
      description: 'סבב מילואים אביב - אימונים ושמירה',
      startDate: daysFromNow(-3),
      endDate: daysFromNow(11),
      location: 'צאלים',
      locationLat: 31.3441,
      locationLng: 34.4739,
      status: ReserveServiceCycleStatus.ACTIVE,
      createdById: companyAAdmin.id,
      companyId: companyA.id,
    },
  });
  console.log(`   ✅ ${cycleA.name} (ACTIVE) — פלוגה א'`);

  const cycleB = await prisma.reserveServiceCycle.upsert({
    where: { id: 'seed-cycle-b' },
    update: {},
    create: {
      id: 'seed-cycle-b',
      name: 'סבב קיץ 2026',
      description: 'סבב מילואים קיץ - פריסה מבצעית',
      startDate: daysFromNow(14),
      endDate: daysFromNow(28),
      location: 'שיזפון',
      locationLat: 29.9312,
      locationLng: 35.0192,
      status: ReserveServiceCycleStatus.PLANNED,
      createdById: companyBAdmin.id,
      companyId: companyB.id,
    },
  });
  console.log(`   ✅ ${cycleB.name} (PLANNED) — פלוגה ב'`);

  // ----------------------------------------------------------
  // 13. SERVICE ATTENDANCES (for active cycle A)
  // ----------------------------------------------------------
  console.log('\n📊 Creating service attendances...');
  const attendanceData = [
    { userId: companyAAdmin.id, status: ServiceAttendanceStatus.ARRIVED, gunNumber: 'M4-001', room: '101' },
    { userId: officerA.id, status: ServiceAttendanceStatus.ARRIVED, gunNumber: 'M4-002', room: '102' },
    { userId: commanderA.id, status: ServiceAttendanceStatus.ARRIVED, gunNumber: 'M4-003', room: '103' },
    { userId: soldiersA[0].id, status: ServiceAttendanceStatus.ARRIVED, gunNumber: 'M4-010', room: '201' },
    { userId: soldiersA[1].id, status: ServiceAttendanceStatus.ARRIVED, gunNumber: 'M4-011', room: '201' },
    { userId: soldiersA[2].id, status: ServiceAttendanceStatus.ARRIVED, gunNumber: 'M4-012', room: '202' },
    { userId: soldiersA[3].id, status: ServiceAttendanceStatus.LATE, gunNumber: null, room: '202' },
    { userId: soldiersA[4].id, status: ServiceAttendanceStatus.NOT_COMING, gunNumber: null, room: null, reason: 'שירות מילואים חופף' },
    { userId: soldiersA[5].id, status: ServiceAttendanceStatus.PENDING, gunNumber: null, room: null },
  ];

  for (const att of attendanceData) {
    await prisma.serviceAttendance.upsert({
      where: { serviceCycleId_userId: { serviceCycleId: cycleA.id, userId: att.userId } },
      update: {},
      create: {
        serviceCycleId: cycleA.id,
        userId: att.userId,
        attendanceStatus: att.status,
        cannotAttendReason: (att as any).reason || null,
        onboardGunNumber: att.gunNumber,
        hotelRoomNumber: att.room,
        checkInAt: att.status === ServiceAttendanceStatus.ARRIVED ? daysFromNow(-2) : null,
      },
    });
  }
  console.log(`   ✅ ${attendanceData.length} attendances (arrived, late, not_coming, pending)`);

  // ----------------------------------------------------------
  // 14. ADMIN CHECKLISTS (for active cycle)
  // ----------------------------------------------------------
  console.log('\n✅ Creating admin checklists...');
  const checklistItems = [
    { category: ServiceChecklistCategory.STAFF, title: 'רשימת סגל מלאה', completed: true },
    { category: ServiceChecklistCategory.WEAPONS, title: 'מפקד נשק', completed: true },
    { category: ServiceChecklistCategory.VEHICLES, title: 'רשימת רכבים ונהגים', completed: false },
    { category: ServiceChecklistCategory.LOGISTICS, title: 'ציוד לוגיסטי', completed: false },
    { category: ServiceChecklistCategory.HOTEL, title: 'חלוקת חדרים', completed: true },
    { category: ServiceChecklistCategory.GENERAL, title: 'תדריך פתיחה', completed: false },
  ];

  for (let i = 0; i < checklistItems.length; i++) {
    const item = checklistItems[i];
    await prisma.serviceAdminChecklist.upsert({
      where: { id: `seed-checklist-admin-${i}` },
      update: {},
      create: {
        id: `seed-checklist-admin-${i}`,
        serviceCycleId: cycleA.id,
        category: item.category,
        title: item.title,
        isCompleted: item.completed,
        completedById: item.completed ? companyAAdmin.id : null,
        completedAt: item.completed ? new Date() : null,
        sortOrder: i + 1,
      },
    });
  }
  console.log(`   ✅ ${checklistItems.length} checklist items (3 completed, 3 pending)`);

  // ----------------------------------------------------------
  // 15. SERVICE VEHICLES
  // ----------------------------------------------------------
  console.log('\n🚗 Creating service vehicles...');
  await prisma.serviceVehicle.upsert({
    where: { id: 'seed-vehicle-1' },
    update: {},
    create: {
      id: 'seed-vehicle-1',
      serviceCycleId: cycleA.id,
      vehicleNumber: '85-432-01',
      vehicleType: 'האמר',
      driverUserId: soldiersA[0].id,
    },
  });
  await prisma.serviceVehicle.upsert({
    where: { id: 'seed-vehicle-2' },
    update: {},
    create: {
      id: 'seed-vehicle-2',
      serviceCycleId: cycleA.id,
      vehicleNumber: '92-118-03',
      vehicleType: 'נגמ"ש',
      driverUserId: commanderA.id,
    },
  });
  console.log('   ✅ 2 vehicles assigned');

  // ----------------------------------------------------------
  // 16. MESSAGES (various types)
  // ----------------------------------------------------------
  console.log('\n💬 Creating messages...');
  await prisma.message.upsert({
    where: { id: 'seed-msg-welcome' },
    update: {},
    create: {
      id: 'seed-msg-welcome',
      title: 'ברוכים הבאים למערכת ניהול',
      content: 'מערכת התפעול הפלוגתית החדשה מוכנה לשימוש. נא לעדכן פרטים אישיים.',
      type: MessageType.GENERAL,
      priority: MessagePriority.HIGH,
      companyId: companyA.id,
      createdById: companyAAdmin.id,
    },
  });
  await prisma.message.upsert({
    where: { id: 'seed-msg-food' },
    update: {},
    create: {
      id: 'seed-msg-food',
      title: 'סידור מזון - שבוע קרוב',
      content: 'ארוחת בוקר: 07:00-08:30\nארוחת צהריים: 12:00-14:00\nארוחת ערב: 18:00-20:00',
      type: MessageType.FOOD_AND_OPERATIONS,
      priority: MessagePriority.MEDIUM,
      companyId: companyA.id,
      createdById: logisticsA.id,
    },
  });
  await prisma.message.upsert({
    where: { id: 'seed-msg-ops' },
    update: {},
    create: {
      id: 'seed-msg-ops',
      title: 'פקודת שמירה - עדכון',
      content: 'שינוי בפריסת השמירה החל ממחר. כל הלוחמים להתעדכן בלוח המשמרות.',
      type: MessageType.OPERATIONAL,
      priority: MessagePriority.CRITICAL,
      targetAudience: MessageTargetAudience.ALL,
      companyId: companyA.id,
      createdById: companyAAdmin.id,
    },
  });
  await prisma.message.upsert({
    where: { id: 'seed-msg-dept' },
    update: {},
    create: {
      id: 'seed-msg-dept',
      title: 'מסדר מחלקה - מחר בבוקר',
      content: 'מסדר מחלקה מחר ב-08:00 ליד מגרש המסדרים.',
      type: MessageType.GENERAL,
      priority: MessagePriority.MEDIUM,
      departmentId: deptA1.id,
      companyId: companyA.id,
      createdById: officerA.id,
    },
  });
  await prisma.message.upsert({
    where: { id: 'seed-msg-happy' },
    update: {},
    create: {
      id: 'seed-msg-happy',
      title: 'יום הולדת שמח!',
      content: 'מזל טוב לנועם פרץ ליום הולדתו! 🎂',
      type: MessageType.HAPPY_UPDATES,
      priority: MessagePriority.LOW,
      companyId: companyA.id,
      createdById: companyAAdmin.id,
    },
  });
  // Company B message
  await prisma.message.upsert({
    where: { id: 'seed-msg-b' },
    update: {},
    create: {
      id: 'seed-msg-b',
      title: "ברוכים הבאים לפלוגה ב'",
      content: "מערכת הניהול של פלוגה ב' פעילה.",
      type: MessageType.GENERAL,
      priority: MessagePriority.HIGH,
      companyId: companyB.id,
      createdById: companyBAdmin.id,
    },
  });
  console.log('   ✅ 6 messages created (general, food, ops, department, happy, company B)');

  // ----------------------------------------------------------
  // 17. OPERATIONAL LINKS
  // ----------------------------------------------------------
  console.log('\n🔗 Creating operational links...');
  await prisma.operationalLink.upsert({
    where: { id: 'seed-link-sop' },
    update: {},
    create: {
      id: 'seed-link-sop',
      title: 'נהלי שמירה',
      description: 'נהלי שמירה ואבטחה עדכניים',
      url: 'https://docs.google.com/example-sop',
      createdById: companyAAdmin.id,
      companyId: companyA.id,
    },
  });
  await prisma.operationalLink.upsert({
    where: { id: 'seed-link-contacts' },
    update: {},
    create: {
      id: 'seed-link-contacts',
      title: 'טלפונים חשובים',
      description: 'רשימת טלפונים חיוניים',
      url: 'https://docs.google.com/example-contacts',
      createdById: companyAAdmin.id,
      companyId: companyA.id,
    },
  });
  console.log('   ✅ 2 operational links created');

  // ----------------------------------------------------------
  // 18. SOCIAL ACTIVITIES
  // ----------------------------------------------------------
  console.log('\n🎉 Creating social activities...');
  await prisma.socialActivity.upsert({
    where: { id: 'seed-social-1' },
    update: {},
    create: {
      id: 'seed-social-1',
      title: 'ערב פיצה',
      description: 'הזמנת פיצות לפלוגה',
      place: 'חדר אוכל',
      startTime: hoursFromNow(4),
      maxParticipants: 30,
      status: SocialActivityStatus.OPEN,
      createdById: commanderA.id,
      companyId: companyA.id,
    },
  });
  await prisma.socialActivity.upsert({
    where: { id: 'seed-social-2' },
    update: {},
    create: {
      id: 'seed-social-2',
      title: 'משחק כדורגל',
      description: "משחק ידידותי מחלקה 1 נגד מחלקה 2",
      place: 'מגרש כדורגל',
      startTime: daysFromNow(1),
      maxParticipants: 22,
      status: SocialActivityStatus.OPEN,
      createdById: soldiersA[0].id,
      companyId: companyA.id,
    },
  });

  // Add participants
  await prisma.socialActivityParticipant.upsert({
    where: { activityId_userId: { activityId: 'seed-social-1', userId: soldiersA[0].id } },
    update: {},
    create: { activityId: 'seed-social-1', userId: soldiersA[0].id },
  });
  await prisma.socialActivityParticipant.upsert({
    where: { activityId_userId: { activityId: 'seed-social-1', userId: soldiersA[1].id } },
    update: {},
    create: { activityId: 'seed-social-1', userId: soldiersA[1].id },
  });
  await prisma.socialActivityParticipant.upsert({
    where: { activityId_userId: { activityId: 'seed-social-2', userId: soldiersA[2].id } },
    update: {},
    create: { activityId: 'seed-social-2', userId: soldiersA[2].id },
  });
  console.log('   ✅ 2 social activities with participants');

  // ----------------------------------------------------------
  // 19. EMERGENCY EVENT (expired for history)
  // ----------------------------------------------------------
  console.log('\n🚨 Creating emergency event...');
  await prisma.emergencyEvent.upsert({
    where: { id: 'seed-emergency-1' },
    update: {},
    create: {
      id: 'seed-emergency-1',
      title: 'בדיקת מוכנות - תרגיל',
      serviceCycleId: cycleA.id,
      createdById: companyAAdmin.id,
      startedAt: hoursFromNow(-2),
      expiresAt: hoursFromNow(-1.5),
      status: EmergencyEventStatus.EXPIRED,
      companyId: companyA.id,
      targetUserIds: soldiersA.map((s) => s.id),
    },
  });

  // Some acknowledgements
  for (const s of soldiersA.slice(0, 4)) {
    await prisma.emergencyAcknowledgement.upsert({
      where: { emergencyEventId_userId: { emergencyEventId: 'seed-emergency-1', userId: s.id } },
      update: {},
      create: { emergencyEventId: 'seed-emergency-1', userId: s.id },
    });
  }
  console.log('   ✅ Emergency event with 4/6 acknowledgements');

  // ----------------------------------------------------------
  // 20. SOLDIER STATUS
  // ----------------------------------------------------------
  console.log('\n🟢 Creating soldier statuses...');
  await prisma.soldierStatus.upsert({
    where: { soldierId: soldiersA[3].id },
    update: {},
    create: { soldierId: soldiersA[3].id, status: 'LEAVE', note: 'יציאה קצרה - רופא' },
  });
  await prisma.soldierStatus.upsert({
    where: { soldierId: soldiersA[4].id },
    update: {},
    create: { soldierId: soldiersA[4].id, status: 'ACTIVE' },
  });
  console.log('   ✅ Soldier statuses set');

  // ----------------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------------
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 SEED COMPLETE — Test Login Credentials');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('All passwords: Yogev2024! (except System Technical)');
  console.log('');
  console.log('👑 מפקד גדוד (BATTALION_ADMIN):   1000000');
  console.log("🏢 מפקד פלוגה א' (ADMIN):          2000001");
  console.log("🏢 מפקד פלוגה ב' (ADMIN):          2000002");
  console.log("⭐ קצין מחלקה (OFFICER):            3000001");
  console.log('📦 לוגיסטיקה (LOGISTICS):           3000002');
  console.log('🎖️  מפקד כיתה (COMMANDER):           4000001');
  console.log("🪖 חייל פלוגה א' (SOLDIER):         5000001-5000006");
  console.log("🪖 חייל פלוגה ב' (SOLDIER):         6000001-6000004");
  console.log('🔧 System Technical:                 060196 / parnasa2026S!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

async function upsertDepartment(id: string, name: string, code: string, companyId: string) {
  const dept = await prisma.department.upsert({
    where: { id },
    update: {},
    create: { id, name, code, isActive: true, companyId },
  });
  console.log(`   ✅ ${name} (${code}) → ${companyId.slice(-1).toUpperCase()}`);
  return dept;
}

async function upsertUser(data: {
  id: string;
  personalId: string;
  fullName: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: UserRole;
  militaryRole: MilitaryRole;
  departmentId: string;
  companyId: string;
  battalionId: string | null;
  idNumber: string;
  armyNumber: string;
}) {
  return prisma.user.upsert({
    where: { personalId: data.personalId },
    update: {},
    create: {
      id: data.id,
      personalId: data.personalId,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      passwordHash: data.passwordHash,
      role: data.role,
      militaryRole: data.militaryRole,
      departmentId: data.departmentId,
      companyId: data.companyId,
      battalionId: data.battalionId,
      idNumber: data.idNumber,
      armyNumber: data.armyNumber,
      isPreApproved: true,
      isRegistered: true,
      isActive: true,
    },
  });
}

// ============================================================
// RUN
// ============================================================

main()
  .catch((e) => {
    console.error('❌ Error during seed:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
