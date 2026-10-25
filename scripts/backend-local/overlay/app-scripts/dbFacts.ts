// Runs inside .reference-backend before migrating. Prints facts for decideDatabaseSafety (scripts/backend-local/env.ts).
// Raw SQL so it also works on a fresh database where the tables don't exist yet. Prints counts only, no rows.
import { PrismaClient } from '@prisma/client';
import { SEED_CANDIDATE_EMAIL } from './seedData';

const prisma = new PrismaClient();

async function main() {
  const [table] = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT to_regclass('public."User"') IS NOT NULL AS "exists"`;
  const userTableExists = table?.exists === true;
  let userCount = 0;
  let seedMarkerFound = false;
  if (userTableExists) {
    const [all] = await prisma.$queryRaw<{ n: bigint }[]>`SELECT COUNT(*)::bigint AS n FROM "User"`;
    const [marker] = await prisma.$queryRaw<{ n: bigint }[]>`
      SELECT COUNT(*)::bigint AS n FROM "User" WHERE email = ${SEED_CANDIDATE_EMAIL}`;
    userCount = Number(all.n);
    seedMarkerFound = Number(marker.n) > 0;
  }
  console.log(`DBFACTS ${JSON.stringify({ userTableExists, userCount, seedMarkerFound })}`);
}

main()
  .catch((e: unknown) => {
    console.error(`[dbFacts] ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
