-- Align Hospital.maxRecruiters default with Basic plan recruiterAccountLimit (config/plans.ts).
ALTER TABLE "Hospital" ALTER COLUMN "maxRecruiters" SET DEFAULT 2;
