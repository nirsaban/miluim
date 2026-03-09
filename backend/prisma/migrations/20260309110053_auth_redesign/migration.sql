-- Auth Redesign Migration
-- This migration adds the new authentication fields while preserving existing data

-- Step 1: Create MilitaryRole enum
DO $$ BEGIN
    CREATE TYPE "MilitaryRole" AS ENUM (
        'PLATOON_COMMANDER',
        'SERGEANT_MAJOR',
        'OPERATIONS_SGT',
        'OPERATIONS_NCO',
        'DUTY_OFFICER',
        'SQUAD_COMMANDER',
        'FIGHTER'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Create departments table
CREATE TABLE IF NOT EXISTS "departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "departments_name_key" ON "departments"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "departments_code_key" ON "departments"("code");

-- Step 3: Create permissions table
CREATE TABLE IF NOT EXISTS "permissions" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "permissions_key_key" ON "permissions"("key");

-- Step 4: Create role_permissions table
CREATE TABLE IF NOT EXISTS "role_permissions" (
    "id" TEXT NOT NULL,
    "militaryRole" "MilitaryRole" NOT NULL,
    "permissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "role_permissions_militaryRole_permissionId_key"
ON "role_permissions"("militaryRole", "permissionId");

-- Step 5: Add new columns to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "personalId" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "militaryRole" "MilitaryRole";
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "departmentId" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isPreApproved" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isRegistered" BOOLEAN NOT NULL DEFAULT true;

-- Step 6: Migrate existing data - set personalId from armyNumber
UPDATE "users" SET "personalId" = "armyNumber" WHERE "personalId" IS NULL;

-- Step 7: Set militaryRole based on existing role
UPDATE "users" SET "militaryRole" =
    CASE
        WHEN "role" = 'ADMIN' THEN 'PLATOON_COMMANDER'::"MilitaryRole"
        WHEN "role" = 'OFFICER' THEN 'DUTY_OFFICER'::"MilitaryRole"
        WHEN "role" = 'COMMANDER' THEN 'SQUAD_COMMANDER'::"MilitaryRole"
        ELSE 'FIGHTER'::"MilitaryRole"
    END
WHERE "militaryRole" IS NULL;

-- Step 8: Mark all existing users as pre-approved and registered
UPDATE "users" SET "isPreApproved" = true, "isRegistered" = true WHERE "isPreApproved" = false;

-- Step 9: Set NOT NULL constraints after data migration
ALTER TABLE "users" ALTER COLUMN "personalId" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "personalId" SET DEFAULT '';
ALTER TABLE "users" ALTER COLUMN "militaryRole" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "militaryRole" SET DEFAULT 'FIGHTER'::"MilitaryRole";

-- Step 10: Create unique index on personalId
CREATE UNIQUE INDEX IF NOT EXISTS "users_personalId_key" ON "users"("personalId");

-- Step 11: Add foreign key for department
DO $$ BEGIN
    ALTER TABLE "users" ADD CONSTRAINT "users_departmentId_fkey"
    FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 12: Add foreign key for role_permissions
DO $$ BEGIN
    ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey"
    FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 13: Make armyNumber nullable (since personalId is now the primary identifier)
ALTER TABLE "users" ALTER COLUMN "armyNumber" DROP NOT NULL;

-- Step 14: Add createdById to messages table if not exists
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "createdById" TEXT;

DO $$ BEGIN
    ALTER TABLE "messages" ADD CONSTRAINT "messages_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
