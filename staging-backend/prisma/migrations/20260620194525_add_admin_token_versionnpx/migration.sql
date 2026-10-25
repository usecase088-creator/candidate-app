/*
  Warnings:

  - You are about to drop the column `uploadedCvData` on the `Candidate` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[mobile,role]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "AdminUser" ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Application" ALTER COLUMN "status" SET DEFAULT 'Applied';

-- AlterTable
ALTER TABLE "Candidate" DROP COLUMN "uploadedCvData",
ADD COLUMN     "searchBlob" TEXT,
ALTER COLUMN "expectedSalaryMin" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "expectedSalaryMax" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "currentSalaryMin" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "currentSalaryMax" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "postedById" TEXT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PaymentOrder" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "notifHighMatch" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifOnApply" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifWeekly" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Job_role_idx" ON "Job"("role");

-- CreateIndex
CREATE INDEX "Job_location_idx" ON "Job"("location");

-- CreateIndex
CREATE INDEX "Job_specialty_idx" ON "Job"("specialty");

-- CreateIndex
CREATE UNIQUE INDEX "User_mobile_role_key" ON "User"("mobile", "role");

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_postedById_fkey" FOREIGN KEY ("postedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
