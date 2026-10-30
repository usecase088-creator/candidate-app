import path from 'node:path';

import { buildRenderServicePayload, buildStagingEnv, shouldCopyStaging, STAGING, stagingSource } from '../staging.ts';

const DEV_POOLED =
  'postgresql://user:secret@ep-dev-123-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const DEV_DIRECT =
  'postgresql://user:secret@ep-dev-123.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

function localEnv(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    DATABASE_URL: DEV_POOLED,
    DATABASE_URL_UNPOOLED: DEV_DIRECT,
    CLOUDINARY_CLOUD_NAME: 'dev-cloud',
    CLOUDINARY_API_KEY: 'k',
    CLOUDINARY_API_SECRET: 's',
    JWT_SECRET: 'local-jwt-secret-local-jwt-secret-1234',
    NODE_ENV: 'development',
    PORT: '3000',
    ALLOWED_ORIGINS_CANDIDATE: 'http://localhost:8081',
    RAZORPAY_KEY_ID: 'dummy',
    RAZORPAY_KEY_SECRET: 'dummy',
    BREVO_API_KEY: 'dummy',
    OTP_TEST_MODE: 'true',
    OTP_TEST_NUMBERS: '9000000001,9000000002,9000000003',
    TEST_MOBILE: '9876543210',
    RENDER_API: 'rnd_production_key',
    RENDER_STAGING_API: 'rnd_staging_key',
    EXPO_TOKEN: 'expo-secret',
    GITHUB_TOKEN: 'github-secret',
    ...overrides,
  };
}

const NEW_JWT = 'f'.repeat(64);

describe('buildStagingEnv', () => {
  it('keeps the dev database and OTP test mode, which are what makes it a test backend', () => {
    expect(buildStagingEnv(localEnv(), NEW_JWT)).toMatchObject({
      DATABASE_URL: DEV_POOLED,
      DATABASE_URL_UNPOOLED: DEV_DIRECT,
      OTP_TEST_MODE: 'true',
      OTP_TEST_NUMBERS: '9000000001,9000000002,9000000003',
    });
  });

  it('turns on push to phones (backend PR 7: off unless EXPO_PUSH_ENABLED=true), so the preview build can be tested', () => {
    expect(buildStagingEnv(localEnv(), NEW_JWT).EXPO_PUSH_ENABLED).toBe('true');
  });

  it('is not NODE_ENV=production, because OTP test mode and its OTP limit switch themselves off there', () => {
    expect(buildStagingEnv(localEnv(), NEW_JWT).NODE_ENV).toBe('staging');
  });

  it('uses its own JWT secret, so tokens from the local backend never work here', () => {
    const env = buildStagingEnv(localEnv(), NEW_JWT);
    expect(env.JWT_SECRET).toBe(NEW_JWT);
    expect(env.JWT_SECRET).not.toBe(localEnv().JWT_SECRET);
  });

  it('refuses a JWT secret that is short or copied from the local one', () => {
    expect(() => buildStagingEnv(localEnv(), 'short')).toThrow(/JWT/);
    expect(() => buildStagingEnv(localEnv(), localEnv().JWT_SECRET)).toThrow(/JWT/);
  });

  it('lets Render choose the port', () => {
    expect(buildStagingEnv(localEnv(), NEW_JWT)).not.toHaveProperty('PORT');
  });

  it('never hands tokens or app-only secrets to the server', () => {
    const env = buildStagingEnv(localEnv(), NEW_JWT);
    for (const key of ['RENDER_API', 'RENDER_STAGING_API', 'EXPO_TOKEN', 'GITHUB_TOKEN', 'TEST_MOBILE']) {
      expect(env).not.toHaveProperty(key);
    }
  });

  it('sends no empty values (Render would reject them) and no email key (email stays off, D14)', () => {
    const env = buildStagingEnv(localEnv(), NEW_JWT);
    expect(Object.values(env).every((v) => v !== '')).toBe(true);
    expect(env).not.toHaveProperty('BREVO_API_KEY');
  });

  it('pins Node 24 on the build servers', () => {
    expect(buildStagingEnv(localEnv(), NEW_JWT).NODE_VERSION).toMatch(/^24\./);
  });

  it('still refuses a database that is not Neon (D13)', () => {
    expect(() =>
      buildStagingEnv(localEnv({ DATABASE_URL: 'postgresql://u:p@dpg-abc.render.com/db' }), NEW_JWT),
    ).toThrow(/DATABASE_URL/);
  });
});

describe('buildRenderServicePayload', () => {
  const payload = buildRenderServicePayload({
    ownerId: 'tea-123',
    repo: 'https://github.com/usecase088-creator/candidate-app',
    env: { A: '1', B: '2' },
  });

  it('is a free web service in Singapore (next to the Neon database), built from staging-backend/', () => {
    expect(payload).toMatchObject({
      type: 'web_service',
      name: STAGING.name,
      ownerId: 'tea-123',
      repo: 'https://github.com/usecase088-creator/candidate-app',
      branch: 'main',
      rootDir: 'staging-backend',
      autoDeploy: 'yes',
      serviceDetails: { runtime: 'node', plan: 'free', region: 'singapore', healthCheckPath: '/health' },
    });
  });

  it('builds with the backend build script and applies migrations, then the missing tables, on start', () => {
    const d = payload.serviceDetails.envSpecificDetails;
    expect(d.buildCommand).toBe('npm ci && npm run build');
    expect(d.startCommand).toBe(
      'npx prisma migrate deploy && npx prisma db push --skip-generate && node dist/index.js',
    );
  });

  it('carries the env vars as key/value pairs', () => {
    expect(payload.envVars).toEqual([
      { key: 'A', value: '1' },
      { key: 'B', value: '2' },
    ]);
  });
});

describe('shouldCopyStaging', () => {
  it.each([
    'package.json',
    'package-lock.json',
    'prisma/schema.prisma',
    'src/index.ts',
    'src/lib/otpTestMode.ts',
  ])('copies %s', (p) => expect(shouldCopyStaging(p)).toBe(true));

  it.each([
    'node_modules/x/index.js',
    'dist/index.js',
    '.env',
    '.env.production.example',
    'src/__tests__/auth.test.ts',
    'vitest.config.ts',
    'scripts/seed-admin.ts',
    'app-scripts/seedApp.ts',
    'logs/combined.log',
    'logs/error.log',
  ])('skips %s (tests, audit scripts, secrets, installed packages, local logs)', (p) => {
    expect(shouldCopyStaging(p)).toBe(false);
  });
});

describe('stagingSource', () => {
  const root = path.resolve('/dev/ah');

  it('takes the reference backend ../job/backend by default', () => {
    expect(stagingSource([], root)).toBe(path.resolve('/dev/job/backend'));
  });

  it('takes --source <folder>, relative to the app repo (backend PR branches checked out in ../job-hotfix)', () => {
    expect(stagingSource(['--source', '../job-hotfix/backend'], root)).toBe(path.resolve('/dev/job-hotfix/backend'));
  });

  it('refuses a missing value and any folder inside this repo (it would copy itself)', () => {
    expect(() => stagingSource(['--source'], root)).toThrow(/--source needs a folder/);
    expect(() => stagingSource(['--source', 'staging-backend'], root)).toThrow(/outside this repo/);
    expect(() => stagingSource(['--source', '.'], root)).toThrow(/outside this repo/);
  });
});
