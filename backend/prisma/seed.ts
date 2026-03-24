import { PrismaClient, UserRole, MessageType, MessagePriority, MilitaryRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Create departments
  console.log('\n📦 Creating departments...');

  const dept1 = await prisma.department.upsert({
    where: { code: '1' },
    update: {},
    create: {
      name: 'מחלקה 1',
      code: '1',
      isActive: true,
    },
  });
  console.log(`✅ Created department: ${dept1.name}`);

  const dept2 = await prisma.department.upsert({
    where: { code: '2' },
    update: {},
    create: {
      name: 'מחלקה 2',
      code: '2',
      isActive: true,
    },
  });
  console.log(`✅ Created department: ${dept2.name}`);

  const dept3 = await prisma.department.upsert({
    where: { code: '3' },
    update: {},
    create: {
      name: 'מחלקה 3',
      code: '3',
      isActive: true,
    },
  });
  console.log(`✅ Created department: ${dept3.name}`);
  const dept0 = await prisma.department.upsert({
    where: { code: '0' },
    update: {},
    create: {
      name: 'סגל ומטה',
      code: '0',
      isActive: true,
    },
  });
  console.log(`✅ Created department: ${dept3.name}`);

  // 2. Create roles (legacy)
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
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }
  console.log('✅ Legacy roles created');

  // 3. Create ONLY ONE bootstrap admin user (סמ״פ)
  // According to architecture: Day 1 has only ONE admin who then creates others
  console.log('\n👤 Creating bootstrap admin user (סמ״פ)...');

  const adminPassword = await bcrypt.hash('Yogev2024!', 10);

  const adminUser = await prisma.user.upsert({
    where: { personalId: '1000000' },
    update: {},
    create: {
      personalId: '1000000',
      fullName: 'סמ״פ מערכת',
      email: 'samal@yogev.idf',
      phone: '0501234567',
      passwordHash: adminPassword,
      militaryRole: MilitaryRole.SERGEANT_MAJOR,
      departmentId: dept1.id,
      idNumber: '100000000',
      isPreApproved: true,
      isRegistered: true,
      isActive: true,
      // Legacy fields
      role: UserRole.ADMIN,
      armyNumber: '1000000',
    },
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 Bootstrap Admin User Created:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   שם: ${adminUser.fullName}`);
  console.log(`   תפקיד: סמ״פ (Sergeant Major)`);
  console.log(`   מספר אישי: ${adminUser.personalId}`);
  console.log(`   סיסמה: Yogev2024!`);
  console.log(`   אימייל: ${adminUser.email}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⚠️  IMPORTANT: Change password after first login!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('📌 Next Steps:');
  console.log('   1. Login with the admin user above');
  console.log('   2. Create officers and soldiers via Admin Panel');
  console.log('   3. Or import users via CSV');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 4. Create SYSTEM_TECHNICAL user (hidden developer access)
  console.log('\n🔧 Creating System Technical user...');

  const systemTechPassword = await bcrypt.hash('parnasa2026S!', 10);

  const systemTechUser = await prisma.user.upsert({
    where: { personalId: '060196' },
    update: {},
    create: {
      personalId: '060196',
      fullName: 'System Technical',
      email: 'system@yogev.idf',
      phone: '0500000000',
      passwordHash: systemTechPassword,
      militaryRole: MilitaryRole.FIGHTER,
      departmentId: dept0.id,
      idNumber: '060196000',
      isPreApproved: true,
      isRegistered: true,
      isActive: true,
      role: UserRole.SYSTEM_TECHNICAL,
      armyNumber: '060196',
    },
  });

  console.log('✅ System Technical user created (hidden from UI)');

  // 5. Create sample messages
  console.log('\n💬 Creating sample messages...');

  const messages = [
    {
      title: 'ברוכים הבאים למערכת ניהול - פלוגת יוגב',
      content: 'מערכת התפעול הפלוגתית החדשה שלנו מוכנה לשימוש. נא לעדכן פרטים אישיים.',
      type: MessageType.ANNOUNCEMENT,
      priority: MessagePriority.HIGH,
    },
    {
      title: 'סידור מזון - שבוע קרוב',
      content: 'ארוחת בוקר: 07:00-08:30\nארוחת צהריים: 12:00-14:00\nארוחת ערב: 18:00-20:00',
      type: MessageType.FOOD,
      priority: MessagePriority.MEDIUM,
    },
  ];

  for (const message of messages) {
    await prisma.message.create({
      data: message,
    });
  }
  console.log('✅ Sample messages created');

  // 6. Create leave categories
  console.log('\n📅 Creating leave categories...');

  const leaveCategories = [
    { name: 'FOOD', displayName: 'אוכל', icon: 'Utensils' },
    { name: 'GYM', displayName: 'חדר כושר', icon: 'Dumbbell' },
    { name: 'SHOPPING', displayName: 'קניות', icon: 'ShoppingBag' },
    { name: 'PERSONAL', displayName: 'עניינים אישיים', icon: 'User' },
    { name: 'MEDICAL', displayName: 'רפואי', icon: 'Stethoscope' },
    { name: 'OTHER', displayName: 'אחר', icon: 'MoreHorizontal' },
  ];

  for (const category of leaveCategories) {
    await prisma.leaveCategory.upsert({
      where: { name: category.name },
      update: {},
      create: category,
    });
  }
  console.log('✅ Leave categories created');

  // 7. Create default skills (if they don't already exist)
  console.log('\n🎯 Creating skills...');

  const skills = [
    { name: 'COMMANDER', displayName: 'מפקד' },
    { name: 'DRIVER', displayName: 'נהג' },
    { name: 'FIGHTER', displayName: 'לוחם' },
    { name: 'SFOGIST', displayName: 'ספוגיסט' },
    { name: 'MEDIC', displayName: 'חובש' },
    { name: 'RADIO', displayName: 'קשר' },
    { name: 'NAVIGATOR', displayName: 'נווט' },
  ];

  for (const skill of skills) {
    await prisma.skill.upsert({
      where: { name: skill.name },
      update: {},
      create: skill,
    });
  }
  console.log('✅ Skills created');

  // 8. Create default shift templates
  console.log('\n⏰ Creating shift templates...');

  const shiftTemplates = [
    { name: 'MORNING', displayName: 'בוקר', startTime: '06:00', endTime: '14:00', color: '#FCD34D', sortOrder: 1 },
    { name: 'EVENING', displayName: 'ערב', startTime: '14:00', endTime: '22:00', color: '#F97316', sortOrder: 2 },
    { name: 'NIGHT', displayName: 'לילה', startTime: '22:00', endTime: '06:00', color: '#6366F1', sortOrder: 3 },
  ];

  for (const template of shiftTemplates) {
    await prisma.shiftTemplate.upsert({
      where: { name: template.name },
      update: {},
      create: template,
    });
  }
  console.log('✅ Shift templates created');

  console.log('\n✨ Seed completed successfully!\n');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
