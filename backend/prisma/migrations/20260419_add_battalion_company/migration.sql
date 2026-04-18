-- CreateEnum: Add new roles
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'BATTALION_ADMIN';

-- CreateTable: battalions
CREATE TABLE IF NOT EXISTS "battalions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "battalions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique battalion name
CREATE UNIQUE INDEX IF NOT EXISTS "battalions_name_key" ON "battalions"("name");

-- CreateTable: companies
CREATE TABLE IF NOT EXISTS "companies" (
    "id" TEXT NOT NULL,
    "battalionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique battalion+code
CREATE UNIQUE INDEX IF NOT EXISTS "companies_battalionId_code_key" ON "companies"("battalionId", "code");
CREATE INDEX IF NOT EXISTS "companies_battalionId_idx" ON "companies"("battalionId");

-- AddForeignKey: companies → battalions
ALTER TABLE "companies" ADD CONSTRAINT "companies_battalionId_fkey"
    FOREIGN KEY ("battalionId") REFERENCES "battalions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add companyId to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "companyId" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "battalionId" TEXT;
CREATE INDEX IF NOT EXISTS "users_companyId_idx" ON "users"("companyId");

-- Add companyId to departments
ALTER TABLE "departments" ADD COLUMN IF NOT EXISTS "companyId" TEXT;
CREATE INDEX IF NOT EXISTS "departments_companyId_idx" ON "departments"("companyId");

-- Add companyId to zones
ALTER TABLE "zones" ADD COLUMN IF NOT EXISTS "companyId" TEXT;
CREATE INDEX IF NOT EXISTS "zones_companyId_idx" ON "zones"("companyId");

-- Add companyId to shift_templates
ALTER TABLE "shift_templates" ADD COLUMN IF NOT EXISTS "companyId" TEXT;
CREATE INDEX IF NOT EXISTS "shift_templates_companyId_idx" ON "shift_templates"("companyId");

-- Add companyId to shift_schedules
ALTER TABLE "shift_schedules" ADD COLUMN IF NOT EXISTS "companyId" TEXT;
CREATE INDEX IF NOT EXISTS "shift_schedules_companyId_idx" ON "shift_schedules"("companyId");

-- Add companyId to skills
ALTER TABLE "skills" ADD COLUMN IF NOT EXISTS "companyId" TEXT;
CREATE INDEX IF NOT EXISTS "skills_companyId_idx" ON "skills"("companyId");

-- Add companyId to leave_categories
ALTER TABLE "leave_categories" ADD COLUMN IF NOT EXISTS "companyId" TEXT;
CREATE INDEX IF NOT EXISTS "leave_categories_companyId_idx" ON "leave_categories"("companyId");

-- Add companyId to operational_links
ALTER TABLE "operational_links" ADD COLUMN IF NOT EXISTS "companyId" TEXT;
CREATE INDEX IF NOT EXISTS "operational_links_companyId_idx" ON "operational_links"("companyId");

-- Add companyId to reserve_service_cycles
ALTER TABLE "reserve_service_cycles" ADD COLUMN IF NOT EXISTS "companyId" TEXT;
ALTER TABLE "reserve_service_cycles" ADD COLUMN IF NOT EXISTS "locationLat" DOUBLE PRECISION;
ALTER TABLE "reserve_service_cycles" ADD COLUMN IF NOT EXISTS "locationLng" DOUBLE PRECISION;
CREATE INDEX IF NOT EXISTS "reserve_service_cycles_companyId_idx" ON "reserve_service_cycles"("companyId");

-- Add companyId to messages
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "companyId" TEXT;
CREATE INDEX IF NOT EXISTS "messages_companyId_idx" ON "messages"("companyId");

-- Add companyId to emergency_events
ALTER TABLE "emergency_events" ADD COLUMN IF NOT EXISTS "companyId" TEXT;
CREATE INDEX IF NOT EXISTS "emergency_events_companyId_idx" ON "emergency_events"("companyId");

-- Add companyId to social_activities
ALTER TABLE "social_activities" ADD COLUMN IF NOT EXISTS "companyId" TEXT;
CREATE INDEX IF NOT EXISTS "social_activities_companyId_idx" ON "social_activities"("companyId");

-- Add companyId to shift_posts
ALTER TABLE "shift_posts" ADD COLUMN IF NOT EXISTS "companyId" TEXT;
CREATE INDEX IF NOT EXISTS "shift_posts_companyId_idx" ON "shift_posts"("companyId");

-- AddForeignKeys for all companyId columns
ALTER TABLE "users" ADD CONSTRAINT "users_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "users" ADD CONSTRAINT "users_battalionId_fkey"
    FOREIGN KEY ("battalionId") REFERENCES "battalions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "departments" ADD CONSTRAINT "departments_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "zones" ADD CONSTRAINT "zones_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "shift_templates" ADD CONSTRAINT "shift_templates_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "shift_schedules" ADD CONSTRAINT "shift_schedules_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "skills" ADD CONSTRAINT "skills_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "leave_categories" ADD CONSTRAINT "leave_categories_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "operational_links" ADD CONSTRAINT "operational_links_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "reserve_service_cycles" ADD CONSTRAINT "reserve_service_cycles_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "emergency_events" ADD CONSTRAINT "emergency_events_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "social_activities" ADD CONSTRAINT "social_activities_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "shift_posts" ADD CONSTRAINT "shift_posts_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
