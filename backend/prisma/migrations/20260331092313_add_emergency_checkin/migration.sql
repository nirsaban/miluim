-- CreateEnum
CREATE TYPE "EmergencyEventStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "emergency_events" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "serviceCycleId" TEXT,
    "createdById" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "EmergencyEventStatus" NOT NULL DEFAULT 'ACTIVE',
    "targetUserIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emergency_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_acknowledgements" (
    "id" TEXT NOT NULL,
    "emergencyEventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emergency_acknowledgements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "emergency_acknowledgements_emergencyEventId_userId_key" ON "emergency_acknowledgements"("emergencyEventId", "userId");

-- AddForeignKey
ALTER TABLE "emergency_events" ADD CONSTRAINT "emergency_events_serviceCycleId_fkey" FOREIGN KEY ("serviceCycleId") REFERENCES "reserve_service_cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_events" ADD CONSTRAINT "emergency_events_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_acknowledgements" ADD CONSTRAINT "emergency_acknowledgements_emergencyEventId_fkey" FOREIGN KEY ("emergencyEventId") REFERENCES "emergency_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_acknowledgements" ADD CONSTRAINT "emergency_acknowledgements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
