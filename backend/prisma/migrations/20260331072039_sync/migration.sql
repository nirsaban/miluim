/*
  Warnings:

  - The values [FOOD,URGENT,ANNOUNCEMENT] on the enum `MessageType` will be removed. If these variants are still used in the database, this will fail.
  - The values [MEDIC,SFOGIST] on the enum `UserRole` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `hasBattery` on the `shift_assignments` table. All the data in the column will be lost.
  - You are about to drop the column `hasPhone` on the `shift_assignments` table. All the data in the column will be lost.
  - You are about to drop the column `hasVehicle` on the `shift_assignments` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "SocialActivityStatus" AS ENUM ('OPEN', 'FULL', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ParticipantStatus" AS ENUM ('JOINED', 'CONFIRMED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "FormType" ADD VALUE 'SHIFT_REQUEST';

-- AlterEnum
BEGIN;
CREATE TYPE "MessageType_new" AS ENUM ('GENERAL', 'OPERATIONAL', 'OPERATIONAL_GUIDELINES', 'CONDUCT_GUIDELINES', 'FOOD_AND_OPERATIONS', 'HAPPY_UPDATES');
ALTER TABLE "messages" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "messages" ALTER COLUMN "type" TYPE "MessageType_new" USING ("type"::text::"MessageType_new");
ALTER TYPE "MessageType" RENAME TO "MessageType_old";
ALTER TYPE "MessageType_new" RENAME TO "MessageType";
DROP TYPE "MessageType_old";
ALTER TABLE "messages" ALTER COLUMN "type" SET DEFAULT 'GENERAL';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('SOLDIER', 'COMMANDER', 'OFFICER', 'LOGISTICS', 'ADMIN', 'SYSTEM_TECHNICAL');
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "UserRole_old";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'SOLDIER';
COMMIT;

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "departmentId" TEXT;

-- AlterTable
ALTER TABLE "shift_assignments" DROP COLUMN "hasBattery",
DROP COLUMN "hasPhone",
DROP COLUMN "hasVehicle",
ADD COLUMN     "batteryLevel" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "requiredPeopleCount" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "social_activities" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "place" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "maxParticipants" INTEGER,
    "status" "SocialActivityStatus" NOT NULL DEFAULT 'OPEN',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_activity_participants" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ParticipantStatus" NOT NULL DEFAULT 'JOINED',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "social_activity_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "social_activity_participants_activityId_userId_key" ON "social_activity_participants"("activityId", "userId");

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_activities" ADD CONSTRAINT "social_activities_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_activity_participants" ADD CONSTRAINT "social_activity_participants_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "social_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_activity_participants" ADD CONSTRAINT "social_activity_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
