// Pure helpers for scripts/backend-local.ts (no file system, no network): env handling and safety checks.

export type Env = Record<string, string | undefined>;

/** Keys copied from .env.local into the backend copy's .env. Everything else (RENDER_API, TEST_MOBILE, EXPO_PUBLIC_*) stays out. */
const REQUIRED_KEYS = [
  'DATABASE_URL',
  'DATABASE_URL_UNPOOLED',
  'JWT_SECRET',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'ALLOWED_ORIGINS_CANDIDATE',
  'OTP_TEST_MODE',
  'OTP_TEST_NUMBERS',
] as const;

/** Only needed for real SMS to numbers outside OTP_TEST_NUMBERS (D3); without them those sends fail with a 500. */
const OPTIONAL_KEYS = [
  'FAST2SMS_API_KEY',
  'FAST2SMS_VERIFICATION_TEMPLATE_ID',
  'FAST2SMS_RESET_TEMPLATE_ID',
] as const;

export function parseEnv(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    let value = line.slice(eq + 1).trim();
    const q = value[0];
    if ((q === '"' || q === "'") && value.length >= 2 && value.endsWith(q)) value = value.slice(1, -1);
    out[line.slice(0, eq).trim()] = value;
  }
  return out;
}

/** D13: the local backend only ever talks to the Neon dev database. Error messages never include credentials. */
export function checkDatabaseUrl(name: string, value: string | undefined): void {
  let url: URL;
  try {
    url = new URL(value ?? '');
  } catch {
    throw new Error(`${name} is missing or not a valid URL.`);
  }
  if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') {
    throw new Error(`${name} must be a Postgres URL.`);
  }
  if (!url.hostname.endsWith('.neon.tech')) {
    throw new Error(
      `${name} host ${url.hostname} is not a Neon host. Only the Neon dev database is allowed (D13).`,
    );
  }
}

export function buildBackendEnv(local: Env): Record<string, string> {
  if (local.NODE_ENV === 'production') {
    throw new Error('NODE_ENV=production in .env.local. The local backend only runs in development.');
  }
  const missing = REQUIRED_KEYS.filter((k) => !local[k]);
  if (missing.length) throw new Error(`Missing in .env.local: ${missing.join(', ')}`);
  checkDatabaseUrl('DATABASE_URL', local.DATABASE_URL);
  checkDatabaseUrl('DATABASE_URL_UNPOOLED', local.DATABASE_URL_UNPOOLED);

  const env: Record<string, string> = {};
  for (const k of REQUIRED_KEYS) env[k] = local[k] as string;
  for (const k of OPTIONAL_KEYS) {
    const v = local[k]?.trim();
    if (v) env[k] = v;
  }
  env.NODE_ENV = 'development';
  env.PORT = local.PORT || '3000';
  // Empty key: the backend logs and skips every email instead of calling Brevo (D14).
  env.BREVO_API_KEY = '';
  return env;
}

export function serializeEnv(env: Record<string, string>): string {
  return Object.entries(env)
    .map(([k, v]) => {
      if (/['\r\n]/.test(v)) throw new Error(`${k} contains a quote or newline; not supported.`);
      return `${k}='${v}'`;
    })
    .join('\n')
    .concat('\n');
}

/** Filter for copying ../job/backend: no installed packages, build output or env files. */
export function shouldCopy(relPath: string): boolean {
  const parts = relPath.split(/[\\/]/);
  if (parts[0] === 'node_modules' || parts[0] === 'dist') return false;
  return !parts.some((p) => p === '.env' || p.startsWith('.env.'));
}

export type DatabaseFacts = { userTableExists: boolean; userCount: number; seedMarkerFound: boolean };

/** Last line of defence if a production URL ever ends up in .env.local: real users but no seed marker → stop. */
export function decideDatabaseSafety(facts: DatabaseFacts): void {
  if (facts.userTableExists && facts.userCount > 0 && !facts.seedMarkerFound) {
    throw new Error(
      `The database has ${facts.userCount} users but none of our seed accounts. ` +
        'It looks like a production or shared database. Stopping before migrating or seeding.',
    );
  }
}
