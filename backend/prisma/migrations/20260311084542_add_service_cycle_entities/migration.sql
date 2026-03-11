/*
  Warnings:

  - Made the column `armyNumber` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "ReserveServiceCycleStatus" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ServiceAttendanceStatus" AS ENUM ('PENDING', 'ARRIVED', 'NOT_COMING', 'LATE', 'LEFT_EARLY');

-- CreateEnum
CREATE TYPE "ServiceChecklistCategory" AS ENUM ('STAFF', 'VEHICLES', 'LOGISTICS', 'HOTEL', 'WEAPONS', 'GENERAL');

-- AlterTable
ALTER TABLE "departments" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "skills" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "armyNumber" SET NOT NULL;

-- CreateTable
CREATE TABLE "reserve_service_cycles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "location" TEXT,
    "status" "ReserveServiceCycleStatus" NOT NULL DEFAULT 'PLANNED',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reserve_service_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_attendances" (
    "id" TEXT NOT NULL,
    "serviceCycleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "attendanceStatus" "ServiceAttendanceStatus" NOT NULL DEFAULT 'PENDING',
    "cannotAttendReason" TEXT,
    "checkInAt" TIMESTAMP(3),
    "checkOutAt" TIMESTAMP(3),
    "onboardGunNumber" TEXT,
    "hotelRoomNumber" TEXT,
    "notes" TEXT,
    "totalActiveDays" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_admin_checklists" (
    "id" TEXT NOT NULL,
    "serviceCycleId" TEXT NOT NULL,
    "category" "ServiceChecklistCategory" NOT NULL DEFAULT 'GENERAL',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedById" TEXT,
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_admin_checklists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_vehicles" (
    "id" TEXT NOT NULL,
    "serviceCycleId" TEXT NOT NULL,
    "vehicleNumber" TEXT NOT NULL,
    "vehicleType" TEXT,
    "driverUserId" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "service_attendances_serviceCycleId_userId_key" ON "service_attendances"("serviceCycleId", "userId");

-- AddForeignKey
ALTER TABLE "reserve_service_cycles" ADD CONSTRAINT "reserve_service_cycles_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_attendances" ADD CONSTRAINT "service_attendances_serviceCycleId_fkey" FOREIGN KEY ("serviceCycleId") REFERENCES "reserve_service_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_attendances" ADD CONSTRAINT "service_attendances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_admin_checklists" ADD CONSTRAINT "service_admin_checklists_serviceCycleId_fkey" FOREIGN KEY ("serviceCycleId") REFERENCES "reserve_service_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_admin_checklists" ADD CONSTRAINT "service_admin_checklists_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_vehicles" ADD CONSTRAINT "service_vehicles_serviceCycleId_fkey" FOREIGN KEY ("serviceCycleId") REFERENCES "reserve_service_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_vehicles" ADD CONSTRAINT "service_vehicles_driverUserId_fkey" FOREIGN KEY ("driverUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
