/**
 * PRODUCTION BACKFILL — Battalion & Company
 *
 * Safe to run on a live database. Idempotent (can run multiple times).
 *
 * What it does:
 *   1. Creates a default battalion (if not exists)
 *   2. Creates a default company under that battalion (if not exists)
 *   3. Backfills companyId on all existing rows where it's NULL
 *   4. Sets the existing ADMIN/SYSTEM_TECHNICAL users' companyId
 *   5. Verifies no NULLs remain
 *
 * Usage:
 *   npx ts-node prisma/migrations/battalion-backfill.ts
 *
 * IMPORTANT: Run this AFTER the Prisma migration that adds the new
 *            Battalion/Company tables and the nullable companyId columns.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_BATTALION_ID = 'default-battalion';
const DEFAULT_COMPANY_ID = 'default-company';

async function main() {
  console.log('🚀 Starting production backfill...\n');

  // ──────────────────────────────────────────
  // 1. Create default battalion
  // ──────────────────────────────────────────
  const battalion = await prisma.battalion.upsert({
    where: { id: DEFAULT_BATTALION_ID },
    update: {},
    create: {
      id: DEFAULT_BATTALION_ID,
      name: 'גדוד ברירת מחדל',
      description: 'גדוד ברירת מחדל — נוצר אוטומטית עבור נתונים קיימים',
    },
  });
  console.log(`✅ Battalion: ${battalion.name} (${battalion.id})`);

  // ──────────────────────────────────────────
  // 2. Create default company
  // ──────────────────────────────────────────
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
  console.log(`✅ Company: ${company.name} (${company.id})\n`);

  // ──────────────────────────────────────────
  // 3. Backfill companyId on all scoped tables
  // ──────────────────────────────────────────
  console.log('📦 Backfilling companyId on existing rows...');

  const tables = [
    'users',
    'departments',
    'zones',
    'shift_templates',
    'shift_schedules',
    'skills',
    'leave_categories',
    'operational_links',
    'reserve_service_cycles',
    'messages',
    'emergency_events',
    'social_activities',
    'shift_posts',
  ];

  for (const table of tables) {
    const result = await prisma.$executeRawUnsafe(
      `UPDATE "${table}" SET "companyId" = $1 WHERE "companyId" IS NULL`,
      DEFAULT_COMPANY_ID,
    );
    console.log(`   ${table}: ${result} rows updated`);
  }

  // ──────────────────────────────────────────
  // 4. Create the BATTALION_ADMIN user
  //    (promote the first existing ADMIN to battalion admin,
  //     or skip if one already exists)
  // ──────────────────────────────────────────
  console.log('\n👑 Checking for battalion admin...');

  const existingBattalionAdmin = await prisma.user.findFirst({
    where: { role: 'BATTALION_ADMIN' },
  });

  if (existingBattalionAdmin) {
    console.log(`   ✅ Battalion admin already exists: ${existingBattalionAdmin.fullName}`);

    // Make sure they have battalionId set
    if (!existingBattalionAdmin.battalionId) {
      await prisma.user.update({
        where: { id: existingBattalionAdmin.id },
        data: { battalionId: DEFAULT_BATTALION_ID },
      });
      console.log(`   ✅ Set battalionId on existing battalion admin`);
    }
  } else {
    console.log('   ⚠️  No BATTALION_ADMIN user found.');
    console.log('   → You can create one via the System Technical dashboard (/system)');
    console.log('   → Or update an existing ADMIN user role to BATTALION_ADMIN');
    console.log('   → And set their battalionId to: ' + DEFAULT_BATTALION_ID);
  }

  // ──────────────────────────────────────────
  // 5. Verify — no NULLs remaining
  // ──────────────────────────────────────────
  console.log('\n🔍 Verification...');

  let allClear = true;
  for (const table of tables) {
    const nullCount = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
      `SELECT COUNT(*) as count FROM "${table}" WHERE "companyId" IS NULL`,
    );
    const totalCount = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
      `SELECT COUNT(*) as count FROM "${table}"`,
    );
    const nulls = Number(nullCount[0].count);
    const total = Number(totalCount[0].count);

    if (nulls > 0) {
      console.log(`   ❌ ${table}: ${nulls}/${total} still NULL`);
      allClear = false;
    } else {
      console.log(`   ✅ ${table}: ${total} rows — all have companyId`);
    }
  }

  if (allClear) {
    console.log('\n🎉 Backfill complete! All existing data is scoped to the default company.');
  } else {
    console.log('\n⚠️  Some rows still have NULL companyId. Check the tables above.');
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📌 Next steps:');
  console.log('   1. Deploy the new code');
  console.log('   2. Create a BATTALION_ADMIN user (or promote existing admin)');
  console.log('   3. Log in as battalion admin to see the battalion dashboard');
  console.log('   4. Create additional companies from the battalion dashboard');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((e) => {
    console.error('❌ Backfill failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
