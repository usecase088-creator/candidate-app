-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "closedReason" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "planSuspendedAt" TIMESTAMP(3),
ADD COLUMN     "planSuspendedReason" TEXT;
