// Runs inside .reference-backend after the backend's own seed. Writes buildSeedData() with upserts (idempotent).
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { buildSeedData, SEED_PASSWORD } from './seedData';

const prisma = new PrismaClient();

async function main() {
  const { candidate, recruiter, hospitals, jobs, govJobs, intlJobs, signupNumbers } = buildSeedData(
    process.env,
    new Date(),
  );
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
  const profile = { name: candidate.name, initials, userId: user.id, deletedAt: null, isSuspended: false };
  await prisma.candidate.upsert({
    where: { email: candidate.email },
    create: { email: candidate.email, ...profile },
    update: profile,
  });

  // Saved jobs of the seeded candidate start empty on every seed, so the Maestro save flow can repeat (dev database only).
  const candidateRow = await prisma.candidate.findUnique({
    where: { email: candidate.email },
    select: { id: true },
  });
  if (candidateRow) await prisma.savedJob.deleteMany({ where: { candidateId: candidateRow.id } });

  for (const { id, ...data } of jobs) {
    const job = { ...data, postedById: recruiterUser.id };
    await prisma.job.upsert({ where: { id }, create: { id, ...job }, update: job });
  }

  for (const { id, ...data } of govJobs) {
    await prisma.govJob.upsert({ where: { id }, create: { id, ...data }, update: data });
  }
  for (const { id, ...data } of intlJobs) {
    await prisma.internationalJob.upsert({ where: { id }, create: { id, ...data }, update: data });
  }

  console.log(
    `[seedApp] ${hospitals.length} hospitals, ${jobs.length} jobs, ${govJobs.length} gov, ${intlJobs.length} international, 1 candidate, 1 recruiter (password: see seedData.ts); freed ${ids.length} signup test account(s)`,
  );
}

main()
  .catch((e: unknown) => {
    console.error(`[seedApp] ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
