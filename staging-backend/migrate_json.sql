DO $$
BEGIN
  ALTER TABLE "Candidate" ALTER COLUMN skills TYPE jsonb USING skills::jsonb;
  ALTER TABLE "Candidate" ALTER COLUMN education TYPE jsonb USING education::jsonb;
  ALTER TABLE "Candidate" ALTER COLUMN certifications TYPE jsonb USING certifications::jsonb;
  ALTER TABLE "Candidate" ALTER COLUMN experience TYPE jsonb USING experience::jsonb;
  ALTER TABLE "Candidate" ALTER COLUMN "profileJson" TYPE jsonb USING "profileJson"::jsonb;
  ALTER TABLE "Candidate" ALTER COLUMN "supportingDocuments" TYPE jsonb USING "supportingDocuments"::jsonb;
  ALTER TABLE "Candidate" ALTER COLUMN "preferredLocations" TYPE jsonb USING "preferredLocations"::jsonb;

  ALTER TABLE "Hospital" ALTER COLUMN specialties TYPE jsonb USING specialties::jsonb;

  ALTER TABLE "Job" ALTER COLUMN tags TYPE jsonb USING tags::jsonb;
  ALTER TABLE "Job" ALTER COLUMN "customApplicationFields" TYPE jsonb USING "customApplicationFields"::jsonb;
END
$$;
