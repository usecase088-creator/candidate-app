-- Submission readiness schema sync.
-- This migration is intentionally guarded for production Neon databases that may
-- already have some fields from a previous manual db push.

-- User additions
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "username" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "fullName" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mobile" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "currentMonthStartDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "jobsPostedThisMonth" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "premiumSearchesThisMonth" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isSuspended" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- Hospital additions
ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3);
ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "isSuspended" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "requestedDocuments" TEXT;
ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "mobileVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "planExpiresAt" TIMESTAMP(3);
ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "pendingPlan" TEXT;
ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "pendingPlanAt" TIMESTAMP(3);
ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "planBillingCycle" TEXT DEFAULT 'monthly';
ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "brandName" TEXT;
ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "registrationAuthority" TEXT;
ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "nabhStatus" TEXT;
ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "nablStatus" TEXT;
ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "gstNumber" TEXT;
ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "panNumber" TEXT;
ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "ownershipType" TEXT;
ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "contactDesignation" TEXT;
ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "contactWhatsapp" TEXT;
ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "contactAlternatePhone" TEXT;
ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "district" TEXT;
ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "pinCode" TEXT;
ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "billingName" TEXT;
ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "billingGstNumber" TEXT;
ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "billingAddress" TEXT;
ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "billingEmail" TEXT;
ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "billingPhone" TEXT;
ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "icuBeds" INTEGER;
ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "numberOfDoctors" INTEGER;
ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "numberOfEmployees" INTEGER;
ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "averageMonthlyHiring" INTEGER;
ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "preferredHiringStates" TEXT;
ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "emergencyHiringRequirement" BOOLEAN;
ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "internshipHiring" BOOLEAN;
ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "campusRecruitment" BOOLEAN;

-- Job additions
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "visibilityEndsAt" TIMESTAMP(3);
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "isFlagged" BOOLEAN NOT NULL DEFAULT false;

-- Candidate additions
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "supportingDocuments" JSONB;
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "expectedSalaryMin" INTEGER;
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "expectedSalaryMax" INTEGER;
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "currentSalaryMin" INTEGER;
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "currentSalaryMax" INTEGER;
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "noticePeriod" TEXT;
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "preferredLocations" JSONB;
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "availabilityStatus" TEXT;
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "isSuspended" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Application additions
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "supportingDocuments" TEXT;
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "interviewDate" TIMESTAMP(3);
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "interviewType" TEXT;
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "meetingLink" TEXT;
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "venue" TEXT;
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "interviewerName" TEXT;
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "interviewerEmail" TEXT;
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "interviewNotes" TEXT;
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "interviewRound" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "interviewHistory" TEXT;
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "candidateResponseNote" TEXT;
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "interviewOutcomeNote" TEXT;
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "requestedDocumentList" TEXT;
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "documentRequestNote" TEXT;
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "offerLetterUrl" TEXT;
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "offerLetterCloudinaryId" TEXT;
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "joiningDate" TIMESTAMP(3);
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "joiningNote" TEXT;
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "finalStatusNote" TEXT;
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "isFlagged" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "interviewScheduledAt" TIMESTAMP(3);
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "offerSentAt" TIMESTAMP(3);
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "joinedAt" TIMESTAMP(3);
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Convert legacy TEXT columns to the JSONB/TIMESTAMP types expected by Prisma.
CREATE OR REPLACE FUNCTION "__try_parse_jsonb"(value TEXT)
RETURNS JSONB AS $$
BEGIN
  IF value IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN value::JSONB;
EXCEPTION WHEN others THEN
  RETURN to_jsonb(value);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "__try_parse_timestamp"(value TEXT)
RETURNS TIMESTAMP(3) AS $$
BEGIN
  IF value IS NULL OR trim(value) = '' THEN
    RETURN NULL;
  END IF;
  RETURN value::TIMESTAMP(3);
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Hospital' AND column_name = 'specialties' AND data_type <> 'jsonb') THEN
    ALTER TABLE "Hospital" ALTER COLUMN "specialties" TYPE JSONB USING "__try_parse_jsonb"("specialties");
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Job' AND column_name = 'tags' AND data_type <> 'jsonb') THEN
    ALTER TABLE "Job" ALTER COLUMN "tags" TYPE JSONB USING "__try_parse_jsonb"("tags");
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Job' AND column_name = 'customApplicationFields' AND data_type <> 'jsonb') THEN
    ALTER TABLE "Job" ALTER COLUMN "customApplicationFields" TYPE JSONB USING "__try_parse_jsonb"("customApplicationFields");
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Job' AND column_name = 'postedOn' AND data_type <> 'timestamp without time zone') THEN
    ALTER TABLE "Job" ALTER COLUMN "postedOn" TYPE TIMESTAMP(3) USING "__try_parse_timestamp"("postedOn");
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Candidate' AND column_name = 'skills' AND data_type <> 'jsonb') THEN
    ALTER TABLE "Candidate" ALTER COLUMN "skills" TYPE JSONB USING "__try_parse_jsonb"("skills");
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Candidate' AND column_name = 'education' AND data_type <> 'jsonb') THEN
    ALTER TABLE "Candidate" ALTER COLUMN "education" TYPE JSONB USING "__try_parse_jsonb"("education");
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Candidate' AND column_name = 'certifications' AND data_type <> 'jsonb') THEN
    ALTER TABLE "Candidate" ALTER COLUMN "certifications" TYPE JSONB USING "__try_parse_jsonb"("certifications");
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Candidate' AND column_name = 'experience' AND data_type <> 'jsonb') THEN
    ALTER TABLE "Candidate" ALTER COLUMN "experience" TYPE JSONB USING "__try_parse_jsonb"("experience");
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Candidate' AND column_name = 'profileJson' AND data_type <> 'jsonb') THEN
    ALTER TABLE "Candidate" ALTER COLUMN "profileJson" TYPE JSONB USING "__try_parse_jsonb"("profileJson");
  END IF;
END $$;

DROP FUNCTION IF EXISTS "__try_parse_jsonb"(TEXT);
DROP FUNCTION IF EXISTS "__try_parse_timestamp"(TEXT);

-- New workflow/payment tables
CREATE TABLE IF NOT EXISTS "ApplicationDocument" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "cloudinaryId" TEXT NOT NULL,
  "mime" TEXT,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "uploadedBy" TEXT NOT NULL DEFAULT 'CANDIDATE',
  CONSTRAINT "ApplicationDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PlanChangeLog" (
  "id" TEXT NOT NULL,
  "hospitalId" TEXT NOT NULL,
  "fromPlan" TEXT NOT NULL,
  "toPlan" TEXT NOT NULL,
  "changeType" TEXT NOT NULL,
  "amountPaid" DOUBLE PRECISION,
  "effectiveAt" TIMESTAMP(3) NOT NULL,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paymentStatus" TEXT NOT NULL DEFAULT 'Pending',
  "paymentRef" TEXT,
  "note" TEXT,
  CONSTRAINT "PlanChangeLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PaymentOrder" (
  "id" TEXT NOT NULL,
  "hospitalId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "razorpayOrderId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'CREATED',
  "planRequested" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ImpersonationLog" (
  "id" TEXT NOT NULL,
  "adminId" TEXT NOT NULL,
  "targetUserId" TEXT NOT NULL,
  "targetRole" TEXT NOT NULL,
  "targetEmail" TEXT NOT NULL,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ImpersonationLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ResetToken" (
  "id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "mobile" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ResetToken_pkey" PRIMARY KEY ("id")
);

-- Indexes and constraints
CREATE UNIQUE INDEX IF NOT EXISTS "User_hospitalId_username_key" ON "User"("hospitalId", "username");
CREATE INDEX IF NOT EXISTS "Hospital_onboardingStatus_deletedAt_idx" ON "Hospital"("onboardingStatus", "deletedAt");
CREATE INDEX IF NOT EXISTS "Job_status_visibilityEndsAt_idx" ON "Job"("status", "visibilityEndsAt");
CREATE INDEX IF NOT EXISTS "Candidate_specialty_location_experienceYears_idx" ON "Candidate"("specialty", "location", "experienceYears");
CREATE INDEX IF NOT EXISTS "Application_status_idx" ON "Application"("status");
CREATE INDEX IF NOT EXISTS "Application_jobId_idx" ON "Application"("jobId");
CREATE INDEX IF NOT EXISTS "Application_candidateId_idx" ON "Application"("candidateId");
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentOrder_razorpayOrderId_key" ON "PaymentOrder"("razorpayOrderId");
CREATE UNIQUE INDEX IF NOT EXISTS "ResetToken_token_key" ON "ResetToken"("token");
CREATE INDEX IF NOT EXISTS "ResetToken_token_idx" ON "ResetToken"("token");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ApplicationDocument_applicationId_fkey'
  ) THEN
    ALTER TABLE "ApplicationDocument"
      ADD CONSTRAINT "ApplicationDocument_applicationId_fkey"
      FOREIGN KEY ("applicationId") REFERENCES "Application"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PlanChangeLog_hospitalId_fkey'
  ) THEN
    ALTER TABLE "PlanChangeLog"
      ADD CONSTRAINT "PlanChangeLog_hospitalId_fkey"
      FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PaymentOrder_hospitalId_fkey'
  ) THEN
    ALTER TABLE "PaymentOrder"
      ADD CONSTRAINT "PaymentOrder_hospitalId_fkey"
      FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
