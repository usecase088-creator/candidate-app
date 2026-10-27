// Runs inside .reference-backend after the backend's own seed. Writes buildSeedData() with upserts (idempotent).
import bcrypt from 'bcryptjs';
import { Prisma, PrismaClient } from '@prisma/client';
import { buildSeedData, SEED_PASSWORD } from './seedData';

const prisma = new PrismaClient();

async function main() {
  const {
    candidate,
    recruiter,
    hospitals,
    jobs,
    govJobs,
    intlJobs,
    signupNumbers,
    applicant,
    archivedJobs,
    applications,
    applicationDocuments,
  } = buildSeedData(process.env, new Date());
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
  const activeAccount = { passwordHash, deletedAt: null, isSuspended: false, planSuspendedAt: null };

  // Free the signup test numbers: remove candidate accounts created by earlier signup tests (dev database only).
  const leftovers = await prisma.user.findMany({
    where: { role: 'CANDIDATE', mobile: { in: signupNumbers }, email: { not: candidate.email } },
    select: { id: true },
  });
  const ids = leftovers.map((u) => u.id);
  if (ids.length) {
    await prisma.candidate.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }

  for (const { id, ...data } of hospitals) {
    await prisma.hospital.upsert({ where: { id }, create: { id, ...data }, update: data });
  }

  const recruiterUser = await prisma.user.upsert({
    where: { email: recruiter.email },
    create: { ...recruiter, ...activeAccount },
    update: { ...recruiter, ...activeAccount },
  });

  const { initials, ...candidateUser } = candidate;
  const user = await prisma.user.upsert({
    where: { email: candidate.email },
    create: { ...candidateUser, ...activeAccount },
    update: { ...candidateUser, ...activeAccount },
  });
  // The Phase 2 candidate always starts WITHOUT a profile or CV (the "no form CV" cases of Phase 3), whatever an
  // earlier test or probe wrote into the row.
  const profile = {
    name: candidate.name,
    initials,
    userId: user.id,
    deletedAt: null,
    isSuspended: false,
    role: null,
    specialty: null,
    experienceYears: null,
    location: null,
    currentEmployer: null,
    summary: null,
    matchPercent: null,
    verified: false,
    registration: null,
    phone: null,
    languages: null,
    procedures: null,
    skills: Prisma.DbNull,
    education: Prisma.DbNull,
    certifications: Prisma.DbNull,
    experience: Prisma.DbNull,
    profileJson: Prisma.DbNull,
    cvSource: null,
    uploadedCvName: null,
    uploadedCvMime: null,
    cvCloudinaryId: null,
    cvUrl: null,
    avatarUrl: null,
    avatarCloudinaryId: null,
    supportingDocuments: Prisma.DbNull,
    expectedSalaryMin: null,
    expectedSalaryMax: null,
    currentSalaryMin: null,
    currentSalaryMax: null,
    noticePeriod: null,
    preferredLocations: Prisma.DbNull,
    availabilityStatus: null,
    searchBlob: null,
  };
  // Keyed by the login user, and the email is written back too: a test that changed the candidate's email (the
  // website's profile save does) must not make the next seed create a second row.
  await prisma.candidate.upsert({
    where: { userId: user.id },
    create: { email: candidate.email, ...profile },
    update: { email: candidate.email, ...profile },
  });

  // Phase 3: the demo applicant (filled profile, so apply unlocks). Written the way the website's profile save writes it.
  const { initials: applicantInitials, ...applicantUser } = applicant.user;
  const applicantAccount = await prisma.user.upsert({
    where: { email: applicant.user.email },
    create: { ...applicantUser, ...activeAccount },
    update: { ...applicantUser, ...activeAccount },
  });
  const p = applicant.profile;
  const applicantFields = {
    name: p.name,
    initials: applicantInitials,
    userId: applicantAccount.id,
    deletedAt: null,
    isSuspended: false,
    role: p.role,
    specialty: p.specialty,
    experienceYears: p.yearsExperience,
    location: p.state,
    currentEmployer: p.experience[0].hospital,
    summary: p.summary,
    verified: false,
    registration: `${p.registrationNumber} (${p.registrationCouncil})`,
    phone: p.phone,
    languages: JSON.stringify(p.languages),
    procedures: JSON.stringify(p.procedures),
    skills: [...p.clinicalSkills, ...p.technicalSkills],
    education: p.qualifications,
    certifications: p.certifications,
    experience: p.experience,
    profileJson: p as unknown as Prisma.InputJsonValue,
    cvSource: 'form',
    expectedSalaryMin: p.expectedSalaryMin,
    expectedSalaryMax: p.expectedSalaryMax,
    currentSalaryMin: p.currentSalaryMin,
    currentSalaryMax: p.currentSalaryMax,
    noticePeriod: p.availability,
    preferredLocations: p.preferredLocations,
    availabilityStatus: p.availabilityStatus,
    searchBlob: [p.name, p.role, p.specialty, p.state, p.city, ...p.clinicalSkills].join(' ').toLowerCase(),
  };
  const applicantRow = await prisma.candidate.upsert({
    where: { userId: applicantAccount.id },
    create: { email: applicant.user.email, ...applicantFields },
    update: { email: applicant.user.email, ...applicantFields },
  });

  // Saved jobs of the seeded candidate start empty on every seed, so the Maestro save flow can repeat (dev database only).
  const candidateRow = await prisma.candidate.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (candidateRow) await prisma.savedJob.deleteMany({ where: { candidateId: candidateRow.id } });
  // Applications of both test candidates start fresh on every seed, so apply and answer flows can repeat
  // (application documents go with them: the relation cascades).
  const testCandidateIds = [candidateRow?.id, applicantRow.id].filter((id): id is string => !!id);
  await prisma.application.deleteMany({ where: { candidateId: { in: testCandidateIds } } });

  for (const { id, ...data } of jobs) {
    const job = { ...data, postedById: recruiterUser.id };
    await prisma.job.upsert({ where: { id }, create: { id, ...job }, update: job });
  }

  for (const { id, ...data } of archivedJobs) {
    const job = { ...data, postedById: recruiterUser.id };
    await prisma.job.upsert({ where: { id }, create: { id, ...job }, update: job });
  }

  for (const { id, requestedDocumentList, ...data } of applications) {
    await prisma.application.create({
      data: {
        id,
        ...data,
        cvSource: 'form',
        candidateId: applicantRow.id,
        ...(requestedDocumentList ? { requestedDocumentList: JSON.stringify(requestedDocumentList) } : {}),
      },
    });
  }
  for (const { id, ...data } of applicationDocuments) {
    await prisma.applicationDocument.create({ data: { id, ...data } });
  }

  for (const { id, ...data } of govJobs) {
    await prisma.govJob.upsert({ where: { id }, create: { id, ...data }, update: data });
  }
  for (const { id, ...data } of intlJobs) {
    await prisma.internationalJob.upsert({ where: { id }, create: { id, ...data }, update: data });
  }

  console.log(
    `[seedApp] ${hospitals.length} hospitals, ${jobs.length} jobs (+${archivedJobs.length} closed), ${govJobs.length} gov, ${intlJobs.length} international, 2 candidates (${applications.length} applications for the demo applicant), 1 recruiter (password: see seedData.ts); freed ${ids.length} signup test account(s)`,
  );
}

main()
  .catch((e: unknown) => {
    console.error(`[seedApp] ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
