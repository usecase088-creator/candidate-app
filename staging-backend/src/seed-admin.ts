/**
 * seed-admin.ts
 *
 * Production-ready script to create or update the admin account.
 * Reads credentials from environment variables — never hardcodes them.
 *
 * Usage:
 *   npm run seed:admin
 *
 * The script is idempotent:
 *   - If an admin with ADMIN_EMAIL already exists → updates name + password.
 *   - If no admin exists → creates a new one.
 *
 * Required env vars (set in .env before running):
 *   ADMIN_NAME     — Display name for the admin account
 *   ADMIN_EMAIL    — Login email for the admin
 *   ADMIN_PASSWORD — Plain-text password (will be hashed with bcrypt, cost 10)
 */

import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient();

// ─── Validate required env vars ───────────────────────────────────────────────
function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value || !value.trim()) {
    console.error(`\n❌  Missing required environment variable: ${key}`);
    console.error(`   Add it to your .env file and re-run the script.\n`);
    process.exit(1);
  }
  return value.trim();
}

async function main() {
  const name     = getRequiredEnv('ADMIN_NAME');
  const email    = getRequiredEnv('ADMIN_EMAIL').toLowerCase();
  const password = getRequiredEnv('ADMIN_PASSWORD');

  // Enforce minimum password strength in production
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction && password.length < 12) {
    console.error('\n❌  ADMIN_PASSWORD must be at least 12 characters in production.\n');
    process.exit(1);
  }
  if (password === 'change-me-before-running-seed') {
    console.error('\n❌  You must change ADMIN_PASSWORD from the default value before seeding.\n');
    process.exit(1);
  }

  console.log(`\n🌱  Seeding admin account...`);
  console.log(`   Name:  ${name}`);
  console.log(`   Email: ${email}\n`);

  const passwordHash = await bcrypt.hash(password, 10);

  const existing = await prisma.adminUser.findUnique({ where: { email } });

  if (existing) {
    await prisma.adminUser.update({
      where: { email },
      data:  { name, passwordHash },
    });
    console.log(`✅  Admin account updated successfully.\n`);
  } else {
    await prisma.adminUser.create({
      data: { email, name, passwordHash },
    });
    console.log(`✅  Admin account created successfully.\n`);
  }

  console.log(`   The admin can now log in at the admin portal with:`);
  console.log(`   Email:    ${email}`);
  console.log(`   Password: (the one you set in .env)\n`);
}

main()
  .catch((e) => {
    console.error('\n❌  Seed failed:\n', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
