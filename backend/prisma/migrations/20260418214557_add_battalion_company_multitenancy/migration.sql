/*
  Warnings:

  - A unique constraint covering the columns `[companyId,name]` on the table `departments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[companyId,code]` on the table `departments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[companyId,name]` on the table `leave_categories` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[companyId,date,zoneId]` on the table `shift_schedules` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[companyId,name]` on the table `shift_templates` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[companyId,name]` on the table `skills` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[companyId,name]` on the table `zones` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "departments_code_key";

-- DropIndex
DROP INDEX "departments_name_key";

-- DropIndex
DROP INDEX "leave_categories_name_key";

-- DropIndex
DROP INDEX "shift_schedules_date_zoneId_key";

-- DropIndex
DROP INDEX "shift_templates_name_key";

-- DropIndex
DROP INDEX "skills_name_key";

-- DropIndex
DROP INDEX "zones_name_key";

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "type" "ShiftType" NOT NULL DEFAULT 'GUARD';

-- CreateIndex
CREATE UNIQUE INDEX "departments_companyId_name_key" ON "departments"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "departments_companyId_code_key" ON "departments"("companyId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "leave_categories_companyId_name_key" ON "leave_categories"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "shift_schedules_companyId_date_zoneId_key" ON "shift_schedules"("companyId", "date", "zoneId");

-- CreateIndex
CREATE UNIQUE INDEX "shift_templates_companyId_name_key" ON "shift_templates"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "skills_companyId_name_key" ON "skills"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "zones_companyId_name_key" ON "zones"("companyId", "name");
