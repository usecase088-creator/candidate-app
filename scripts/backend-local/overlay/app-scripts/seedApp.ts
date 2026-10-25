// Runs inside .reference-backend after the backend's own seed. Writes buildSeedData() with upserts (idempotent).
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { buildSeedData, SEED_PASSWORD } from './seedData';

const prisma = new PrismaClient();

async function main() {
  const { candidate, recruiter, hospitals, jobs } = buildSeedData(process.env, new Date());
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
  const activeAccount = { passwordHash, deletedAt: null, isSuspended: false, planSuspendedAt: null };

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

  for (const { id, ...data } of jobs) {
    const job = { ...data, postedById: recruiterUser.id };
    await prisma.job.upsert({ where: { id }, create: { id, ...job }, update: job });
  }

  console.log(
    `[seedApp] ${hospitals.length} hospitals, ${jobs.length} jobs, 1 candidate, 1 recruiter (password: see seedData.ts)`,
  );
}

main()
  .catch((e: unknown) => {
    console.error(`[seedApp] ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
