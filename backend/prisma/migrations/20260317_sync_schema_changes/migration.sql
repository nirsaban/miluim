-- AlterTable
ALTER TABLE "shift_assignments" ADD COLUMN "hasBattery" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "missingItems" TEXT;
