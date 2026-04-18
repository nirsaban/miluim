/**
 * PRODUCTION BACKFILL — Battalion & Company
 *
 * Plain JS — runs directly with `node` inside Docker (no ts-node needed).
 * Idempotent — safe to run multiple times.
 *
 * Usage: node prisma/battalion-backfill.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DEFAULT_BATTALION_ID = 'default-battalion';
const DEFAULT_COMPANY_ID = 'default-company';

async function main() {
  console.log('🚀 Starting production backfill...\n');

  // 1. Create default battalion
  const battalion = await prisma.battalion.upsert({
    where: { id: DEFAULT_BATTALION_ID },
    update: {},
    create: {
      id: DEFAULT_BATTALION_ID,
      name: 'גדוד ברירת מחדל',
      description: 'גדוד ברירת מחדל — נוצר אוטומטית עבור נתונים קיימים',
    },
  });
  console.log('✅ Battalion: ' + battalion.name);

  // 2. Create default company
  const company = await prisma.company.upsert({
    where: { id: DEFAULT_COMPANY_ID },
    update: {},
    create: {
      id: DEFAULT_COMPANY_ID,
      battalionId: DEFAULT_BATTALION_ID,
      name: 'פלוגה ברירת מחדל',
      code: 'DEFAULT',
      description: 'פלוגה ברירת מחדל — נוצרה אוטומטית עבור נתונים קיימים',
    },
  });
  console.log('✅ Company: ' + company.name + '\n');

  // 3. Backfill companyId on all scoped tables
  console.log('📦 Backfilling companyId...');
  const tables = [
    'users', 'departments', 'zones', 'shift_templates', 'shift_schedules',
    'skills', 'leave_categories', 'operational_links', 'reserve_service_cycles',
    'messages', 'emergency_events', 'social_activities', 'shift_posts',
  ];

  for (const table of tables) {
    const result = await prisma.$executeRawUnsafe(
      'UPDATE "' + table + '" SET "companyId" = $1 WHERE "companyId" IS NULL',
      DEFAULT_COMPANY_ID,
    );
    console.log('   ' + table + ': ' + result + ' rows updated');
  }

  // 4. Verify
  console.log('\n🔍 Verification...');
  for (const table of tables) {
    const nullCount = await prisma.$queryRawUnsafe(
      'SELECT COUNT(*) as count FROM "' + table + '" WHERE "companyId" IS NULL',
    );
    const totalCount = await prisma.$queryRawUnsafe(
      'SELECT COUNT(*) as count FROM "' + table + '"',
    );
    const nulls = Number(nullCount[0].count);
    const total = Number(totalCount[0].count);
    console.log('   ' + (nulls > 0 ? '❌' : '✅') + ' ' + table + ': ' + total + ' rows' + (nulls > 0 ? ' (' + nulls + ' still NULL!)' : ''));
  }

  console.log('\n🎉 Backfill complete!');
}

main()
  .catch(function(e) {
    console.error('❌ Backfill failed:', e);
    process.exit(1);
  })
  .finally(function() {
    prisma.$disconnect();
  });
