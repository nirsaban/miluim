/**
 * Battalion & Company Backfill Script
 *
 * Run this AFTER the Prisma migration that adds the new tables and nullable columns.
 * It creates a default battalion and company, then backfills all existing data.
 *
 * Usage: npx ts-node prisma/migrations/battalion-seed.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_BATTALION_ID = 'default-battalion';
const DEFAULT_COMPANY_ID = 'default-company';

async function main() {
  console.log('Starting battalion/company backfill...');

  // Step 1: Create default battalion
  const battalion = await prisma.battalion.upsert({
    where: { id: DEFAULT_BATTALION_ID },
    update: {},
    create: {
      id: DEFAULT_BATTALION_ID,
      name: 'גדוד ברירת מחדל',
      description: 'גדוד ברירת מחדל - נוצר אוטומטית עבור נתונים קיימים',
    },
  });
  console.log(`Battalion created/exists: ${battalion.name} (${battalion.id})`);

  // Step 2: Create default company
  const company = await prisma.company.upsert({
    where: { id: DEFAULT_COMPANY_ID },
    update: {},
    create: {
      id: DEFAULT_COMPANY_ID,
      battalionId: DEFAULT_BATTALION_ID,
      name: 'פלוגה ברירת מחדל',
      code: 'DEFAULT',
      description: 'פלוגה ברירת מחדל - נוצרה אוטומטית עבור נתונים קיימים',
    },
  });
  console.log(`Company created/exists: ${company.name} (${company.id})`);

  // Step 3: Backfill all tables with companyId
  const tables = [
    { name: 'users', model: 'user' },
    { name: 'departments', model: 'department' },
    { name: 'zones', model: 'zone' },
    { name: 'shift_templates', model: 'shiftTemplate' },
    { name: 'shift_schedules', model: 'shiftSchedule' },
    { name: 'skills', model: 'skill' },
    { name: 'leave_categories', model: 'leaveCategory' },
    { name: 'operational_links', model: 'operationalLink' },
    { name: 'reserve_service_cycles', model: 'reserveServiceCycle' },
    { name: 'messages', model: 'message' },
    { name: 'emergency_events', model: 'emergencyEvent' },
    { name: 'social_activities', model: 'socialActivity' },
    { name: 'shift_posts', model: 'shiftPost' },
  ];

  for (const table of tables) {
    const result = await prisma.$executeRawUnsafe(
      `UPDATE "${table.name}" SET "companyId" = $1 WHERE "companyId" IS NULL`,
      DEFAULT_COMPANY_ID,
    );
    console.log(`Backfilled ${table.name}: ${result} rows updated`);
  }

  // Step 4: Verify counts
  console.log('\n--- Verification ---');
  for (const table of tables) {
    const nullCount = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
      `SELECT COUNT(*) as count FROM "${table.name}" WHERE "companyId" IS NULL`,
    );
    const totalCount = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
      `SELECT COUNT(*) as count FROM "${table.name}"`,
    );
    console.log(
      `${table.name}: ${totalCount[0].count} total, ${nullCount[0].count} with NULL companyId`,
    );
  }

  console.log('\nBackfill complete!');
}

main()
  .catch((e) => {
    console.error('Backfill failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
