-- CreateTable: WebAuthn Credentials for Passkey/Biometric Authentication
CREATE TABLE "webauthn_credentials" (
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

-- CreateTable: Temporary challenge storage for WebAuthn ceremonies
CREATE TABLE "webauthn_challenges" (
    "id" TEXT NOT NULL,
    "challenge" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webauthn_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "webauthn_credentials_credentialId_key" ON "webauthn_credentials"("credentialId");

-- CreateIndex
CREATE INDEX "webauthn_credentials_userId_idx" ON "webauthn_credentials"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "webauthn_challenges_challenge_key" ON "webauthn_challenges"("challenge");

-- CreateIndex
CREATE INDEX "webauthn_challenges_challenge_idx" ON "webauthn_challenges"("challenge");

-- CreateIndex
CREATE INDEX "webauthn_challenges_userId_idx" ON "webauthn_challenges"("userId");

-- AddForeignKey
ALTER TABLE "webauthn_credentials" ADD CONSTRAINT "webauthn_credentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;