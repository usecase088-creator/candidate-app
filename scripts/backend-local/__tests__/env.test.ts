import {
  buildBackendEnv,
  checkDatabaseUrl,
  decideDatabaseSafety,
  parseEnv,
  serializeEnv,
  shouldCopy,
} from '../env.ts';

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
    JWT_SECRET: 'local-jwt',
    NODE_ENV: 'development',
    PORT: '3000',
    ALLOWED_ORIGINS_CANDIDATE: 'http://localhost:8081',
    RAZORPAY_KEY_ID: 'dummy',
    RAZORPAY_KEY_SECRET: 'dummy',
    BREVO_API_KEY: 'dummy',
    FAST2SMS_API_KEY: 'dummy',
    FAST2SMS_VERIFICATION_TEMPLATE_ID: '1',
    FAST2SMS_RESET_TEMPLATE_ID: '2',
    OTP_TEST_MODE: 'true',
    OTP_TEST_NUMBERS: '9000000001,9000000002',
    TEST_MOBILE: '9876543210',
    RENDER_API: 'rnd_secret',
    EXPO_PUBLIC_SENTRY_DSN: 'https://public@sentry.example/1',
    ...overrides,
  };
}

describe('parseEnv', () => {
  it('reads KEY=value lines and skips comments and blanks', () => {
    const text = '# comment\r\n\r\nA=1\r\nB=x=y\nC=\n  # indented comment\n';
    expect(parseEnv(text)).toEqual({ A: '1', B: 'x=y', C: '' });
  });

  it('strips matching surrounding quotes', () => {
    expect(parseEnv(`A="quoted value"\nB='single'`)).toEqual({ A: 'quoted value', B: 'single' });
  });
});

describe('checkDatabaseUrl', () => {
  it('accepts a Neon Postgres URL', () => {
    expect(() => checkDatabaseUrl('DATABASE_URL', DEV_POOLED)).not.toThrow();
  });

  it.each([
    ['missing', ''],
    ['not a URL', 'nonsense'],
    ['not Postgres', 'mysql://u:p@ep-dev.aws.neon.tech/db'],
    ['not Neon (D13)', 'postgresql://u:p@dpg-abc.oregon-postgres.render.com/db'],
  ])('refuses a URL that is %s', (_label, url) => {
    expect(() => checkDatabaseUrl('DATABASE_URL', url)).toThrow(/DATABASE_URL/);
  });

  it('never puts the password in the error message', () => {
    expect(() => checkDatabaseUrl('DATABASE_URL', 'postgresql://u:hunter2@db.render.com/x')).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining('hunter2') }),
    );
  });
});

describe('buildBackendEnv', () => {
  it('passes the backend keys through and forces development mode', () => {
    const env = buildBackendEnv(localEnv());
    expect(env).toMatchObject({
      DATABASE_URL: DEV_POOLED,
      DATABASE_URL_UNPOOLED: DEV_DIRECT,
      JWT_SECRET: 'local-jwt',
      NODE_ENV: 'development',
      PORT: '3000',
      ALLOWED_ORIGINS_CANDIDATE: 'http://localhost:8081',
      OTP_TEST_MODE: 'true',
      OTP_TEST_NUMBERS: '9000000001,9000000002',
    });
  });

  it('empties the Brevo key so the backend skips email instead of calling Brevo (D14)', () => {
    expect(buildBackendEnv(localEnv()).BREVO_API_KEY).toBe('');
  });

  it('treats the Fast2SMS keys as optional: test numbers never send SMS (D3)', () => {
    const blank = {
      FAST2SMS_API_KEY: ' ',
      FAST2SMS_VERIFICATION_TEMPLATE_ID: '',
      FAST2SMS_RESET_TEMPLATE_ID: '',
    };
    const env = buildBackendEnv(localEnv(blank));
    expect(env).not.toHaveProperty('FAST2SMS_API_KEY');
    expect(env).not.toHaveProperty('FAST2SMS_VERIFICATION_TEMPLATE_ID');
  });

  it('passes the Fast2SMS keys through when set (real SMS to TEST_MOBILE)', () => {
    expect(buildBackendEnv(localEnv())).toMatchObject({
      FAST2SMS_API_KEY: 'dummy',
      FAST2SMS_VERIFICATION_TEMPLATE_ID: '1',
      FAST2SMS_RESET_TEMPLATE_ID: '2',
    });
  });

  it('never hands app-only secrets to the backend', () => {
    const env = buildBackendEnv(localEnv());
    expect(env).not.toHaveProperty('RENDER_API');
    expect(env).not.toHaveProperty('TEST_MOBILE');
    expect(env).not.toHaveProperty('EXPO_PUBLIC_SENTRY_DSN');
  });

  it('defaults PORT to 3000', () => {
    const { PORT: _port, ...rest } = localEnv();
    expect(buildBackendEnv(rest).PORT).toBe('3000');
  });

  it('refuses NODE_ENV=production', () => {
    expect(() => buildBackendEnv(localEnv({ NODE_ENV: 'production' }))).toThrow(/production/);
  });

  it('lists every missing required key', () => {
    const { JWT_SECRET: _a, CLOUDINARY_API_KEY: _b, ...rest } = localEnv();
    expect(() => buildBackendEnv(rest)).toThrow(
      /JWT_SECRET.*CLOUDINARY_API_KEY|CLOUDINARY_API_KEY.*JWT_SECRET/,
    );
  });

  it('checks both database URLs', () => {
    expect(() =>
      buildBackendEnv(localEnv({ DATABASE_URL_UNPOOLED: 'postgresql://u:p@prod.render.com/db' })),
    ).toThrow(/DATABASE_URL_UNPOOLED/);
  });
});

describe('serializeEnv', () => {
  it('writes single-quoted values that parseEnv reads back', () => {
    const env = { A: 'postgresql://u:p@h/db?x=1&y=2', B: '' };
    expect(parseEnv(serializeEnv(env))).toEqual(env);
  });

  it('refuses values with a single quote or newline', () => {
    expect(() => serializeEnv({ A: "it's" })).toThrow(/A/);
    expect(() => serializeEnv({ A: 'a\nb' })).toThrow(/A/);
  });
});

describe('shouldCopy', () => {
  it.each(['package.json', 'src/index.ts', 'prisma/schema.prisma', 'src/lib/otp.ts'])('copies %s', (p) =>
    expect(shouldCopy(p)).toBe(true),
  );

  it.each([
    'node_modules',
    'node_modules/x/index.js',
    'dist/index.js',
    '.env',
    '.env.production',
    'src/.env',
  ])('skips %s', (p) => expect(shouldCopy(p)).toBe(false));

  it('accepts Windows separators', () => {
    expect(shouldCopy('node_modules\\x')).toBe(false);
    expect(shouldCopy('src\\index.ts')).toBe(true);
  });
});

describe('decideDatabaseSafety', () => {
  it('allows a fresh database (no tables yet)', () => {
    expect(() =>
      decideDatabaseSafety({ userTableExists: false, userCount: 0, seedMarkerFound: false }),
    ).not.toThrow();
  });

  it('allows an empty database', () => {
    expect(() =>
      decideDatabaseSafety({ userTableExists: true, userCount: 0, seedMarkerFound: false }),
    ).not.toThrow();
  });

  it('allows a database our seed already ran on', () => {
    expect(() =>
      decideDatabaseSafety({ userTableExists: true, userCount: 12, seedMarkerFound: true }),
    ).not.toThrow();
  });

  it('refuses a database with users our seed did not create (looks like production)', () => {
    expect(() =>
      decideDatabaseSafety({ userTableExists: true, userCount: 12, seedMarkerFound: false }),
    ).toThrow(/production/i);
  });
});
