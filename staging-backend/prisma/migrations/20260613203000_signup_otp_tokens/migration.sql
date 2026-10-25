CREATE TABLE IF NOT EXISTS "OtpVerificationToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpVerificationToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OtpVerificationToken_token_key" ON "OtpVerificationToken"("token");
CREATE INDEX IF NOT EXISTS "OtpVerificationToken_token_idx" ON "OtpVerificationToken"("token");
CREATE INDEX IF NOT EXISTS "OtpVerificationToken_mobile_role_purpose_idx" ON "OtpVerificationToken"("mobile", "role", "purpose");
