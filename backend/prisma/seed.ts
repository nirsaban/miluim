import { PrismaClient, UserRole, MessageType, MessagePriority } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Create roles
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

  console.log('Roles created');

  // Create admin user
  const adminPassword = await bcrypt.hash('Admin123!', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@yogev.idf.il' },
    update: {},
    create: {
      email: 'admin@yogev.idf.il',
      fullName: 'מנהל מערכת',
      phone: '0501234567',
      passwordHash: adminPassword,
      role: UserRole.ADMIN,
      armyNumber: '0000001',
      idNumber: '000000001',
      dailyJob: 'מנהל מערכת',
      city: 'תל אביב',
    },
  });

  console.log('Admin user created:', admin.email);

  // Create sample commander
  const commanderPassword = await bcrypt.hash('Commander123!', 10);
  const commander = await prisma.user.upsert({
    where: { email: 'commander@yogev.idf.il' },
    update: {},
    create: {
      email: 'commander@yogev.idf.il',
      fullName: 'יוסי כהן',
      phone: '0502345678',
      passwordHash: commanderPassword,
      role: UserRole.COMMANDER,
      armyNumber: '0000002',
      idNumber: '000000002',
      dailyJob: 'מהנדס תוכנה',
      city: 'חיפה',
    },
  });

  console.log('Commander created:', commander.email);

  // Create sample messages
  const messages = [
    {
      title: 'ברוכים הבאים למערכת ניהול - פלוגת יוגב',
      content: 'מערכת התפעול הפלוגתית החדשה שלנו מוכנה לשימוש. נא לעדכן פרטים אישיים.',
      type: MessageType.ANNOUNCEMENT,
      priority: MessagePriority.HIGH,
    },
    {
      title: 'סידור מזון - שבוע קרוב',
      content: 'ארוחת בוקר: 07:00-08:30\nארוחת צהריים: 12:00-14:00\nארוחת ערב: 18:00-20:00\n\nנא להירשם מראש דרך מערכת סייבוס.',
      type: MessageType.FOOD,
      priority: MessagePriority.MEDIUM,
    },
    {
      title: 'תזכורת - עדכון סטטוס',
      content: 'נא לעדכן סטטוס נוכחות עד סוף היום.',
      type: MessageType.GENERAL,
      priority: MessagePriority.LOW,
    },
  ];

  for (const message of messages) {
    await prisma.message.create({
      data: message,
    });
  }

  console.log('Sample messages created');

  // Create leave categories
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

  console.log('Leave categories created');

  // Create default skills
  const skills = [
    { name: 'COMMANDER', displayName: 'מפקד' },
    { name: 'DRIVER', displayName: 'נהג' },
    { name: 'FIGHTER', displayName: 'לוחם' },
    { name: 'SFOGIST', displayName: 'ספוגיסט' },
    { name: 'MEDIC', displayName: 'חובש' },
  ];

  for (const skill of skills) {
    await prisma.skill.upsert({
      where: { name: skill.name },
      update: {},
      create: skill,
    });
  }

  console.log('Skills created');

  // Create default shift templates
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

  console.log('Shift templates created');

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
