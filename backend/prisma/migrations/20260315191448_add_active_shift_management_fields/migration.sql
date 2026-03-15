-- AlterTable
ALTER TABLE "shift_assignments" ADD COLUMN     "arrivedAt" TIMESTAMP(3),
ADD COLUMN     "hasPhone" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasVehicle" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "shift_schedules" ADD COLUMN     "shiftOfficerId" TEXT;

-- AddForeignKey
ALTER TABLE "shift_schedules" ADD CONSTRAINT "shift_schedules_shiftOfficerId_fkey" FOREIGN KEY ("shiftOfficerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
