-- CreateEnum
CREATE TYPE "MessageTargetAudience" AS ENUM ('ALL', 'COMMANDERS_PLUS', 'OFFICERS_PLUS', 'ADMIN_ONLY');

-- AlterTable
ALTER TABLE "messages" ADD COLUMN "targetAudience" "MessageTargetAudience" NOT NULL DEFAULT 'ALL';
