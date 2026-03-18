-- CreateEnum (if not exists)
DO $$ BEGIN
    CREATE TYPE "MessageTargetAudience" AS ENUM ('ALL', 'COMMANDERS_PLUS', 'OFFICERS_PLUS', 'ADMIN_ONLY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable - Add missing columns to messages
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "targetAudience" "MessageTargetAudience" NOT NULL DEFAULT 'ALL';
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "requiresConfirmation" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable (if not exists)
CREATE TABLE IF NOT EXISTS "message_confirmations" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_confirmations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "message_confirmations_messageId_userId_key" ON "message_confirmations"("messageId", "userId");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "message_confirmations" ADD CONSTRAINT "message_confirmations_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "message_confirmations" ADD CONSTRAINT "message_confirmations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
