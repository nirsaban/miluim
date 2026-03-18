-- Sync Migration: Ensure all schema elements exist
-- This migration is idempotent and can be run multiple times safely

-- ============================================================
-- ENUMS
-- ============================================================

DO $$ BEGIN
    CREATE TYPE "MilitaryRole" AS ENUM ('PLATOON_COMMANDER', 'SERGEANT_MAJOR', 'OPERATIONS_SGT', 'OPERATIONS_NCO', 'DUTY_OFFICER', 'SQUAD_COMMANDER', 'FIGHTER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "UserRole" AS ENUM ('SOLDIER', 'COMMANDER', 'OFFICER', 'LOGISTICS', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "FormType" AS ENUM ('SHORT_LEAVE', 'EQUIPMENT_SHORTAGE', 'HOME_LEAVE', 'IMPROVEMENT_SUGGESTION', 'RESTAURANT_RECOMMENDATION', 'SHIFT_REQUEST');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "FormStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "MessageType" AS ENUM ('GENERAL', 'FOOD', 'URGENT', 'ANNOUNCEMENT', 'OPERATIONAL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "MessagePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "MessageTargetAudience" AS ENUM ('ALL', 'COMMANDERS_PLUS', 'OFFICERS_PLUS', 'ADMIN_ONLY');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "ShiftType" AS ENUM ('GUARD', 'PATROL', 'KITCHEN', 'CLEANING', 'SPECIAL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "SoldierStatusType" AS ENUM ('ACTIVE', 'LEAVE', 'SICK', 'TRAINING', 'OTHER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "LeaveType" AS ENUM ('SHORT', 'HOME');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'ACTIVE', 'RETURNED', 'OVERDUE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "RecommendationCategory" AS ENUM ('RESTAURANT', 'ACTIVITY', 'SERVICE', 'OTHER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "ShiftAssignmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "ShiftScheduleStatus" AS ENUM ('DRAFT', 'PUBLISHED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "ReserveServiceCycleStatus" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "ServiceAttendanceStatus" AS ENUM ('PENDING', 'ARRIVED', 'NOT_COMING', 'LATE', 'LEFT_EARLY');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "ServiceChecklistCategory" AS ENUM ('STAFF', 'VEHICLES', 'LOGISTICS', 'HOTEL', 'WEAPONS', 'GENERAL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================
-- TABLES - Create if not exists
-- ============================================================

-- WebAuthn Credentials
CREATE TABLE IF NOT EXISTS "webauthn_credentials" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "counter" BIGINT NOT NULL DEFAULT 0,
    "transports" TEXT[],
    "deviceType" TEXT,
    "backedUp" BOOLEAN NOT NULL DEFAULT false,
    "deviceName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "webauthn_credentials_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "webauthn_challenges" (
    "id" TEXT NOT NULL,
    "challenge" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "webauthn_challenges_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "message_confirmations" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "message_confirmations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "otps" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "otps_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "push_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- COLUMNS - Add if not exists
-- ============================================================

-- Messages table columns
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "targetAudience" "MessageTargetAudience" NOT NULL DEFAULT 'ALL';
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "requiresConfirmation" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Users table columns
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "personalId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isPreApproved" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isRegistered" BOOLEAN NOT NULL DEFAULT true;

-- Shift assignments columns
ALTER TABLE "shift_assignments" ADD COLUMN IF NOT EXISTS "arrivedAt" TIMESTAMP(3);
ALTER TABLE "shift_assignments" ADD COLUMN IF NOT EXISTS "hasVehicle" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "shift_assignments" ADD COLUMN IF NOT EXISTS "hasPhone" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "shift_assignments" ADD COLUMN IF NOT EXISTS "hasBattery" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "shift_assignments" ADD COLUMN IF NOT EXISTS "missingItems" TEXT;

-- ============================================================
-- INDEXES
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS "webauthn_credentials_credentialId_key" ON "webauthn_credentials"("credentialId");
CREATE INDEX IF NOT EXISTS "webauthn_credentials_userId_idx" ON "webauthn_credentials"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "webauthn_challenges_challenge_key" ON "webauthn_challenges"("challenge");
CREATE INDEX IF NOT EXISTS "webauthn_challenges_challenge_idx" ON "webauthn_challenges"("challenge");
CREATE INDEX IF NOT EXISTS "webauthn_challenges_userId_idx" ON "webauthn_challenges"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "message_confirmations_messageId_userId_key" ON "message_confirmations"("messageId", "userId");
CREATE INDEX IF NOT EXISTS "otps_email_code_idx" ON "otps"("email", "code");
CREATE UNIQUE INDEX IF NOT EXISTS "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");
CREATE UNIQUE INDEX IF NOT EXISTS "users_personalId_key" ON "users"("personalId");

-- ============================================================
-- FOREIGN KEYS (with error handling for existing constraints)
-- ============================================================

DO $$ BEGIN
    ALTER TABLE "webauthn_credentials" ADD CONSTRAINT "webauthn_credentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "message_confirmations" ADD CONSTRAINT "message_confirmations_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "message_confirmations" ADD CONSTRAINT "message_confirmations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
