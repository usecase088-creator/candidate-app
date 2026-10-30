-- Queue of Cloudinary files to remove after a candidate deletes their account. Additive: one new table.
-- Rollback: DROP TABLE "CloudinaryCleanup";

-- CreateTable
CREATE TABLE "CloudinaryCleanup" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastTriedAt" TIMESTAMP(3),

    CONSTRAINT "CloudinaryCleanup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CloudinaryCleanup_createdAt_idx" ON "CloudinaryCleanup"("createdAt");
