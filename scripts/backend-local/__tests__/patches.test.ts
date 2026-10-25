import { applyEdits, PATCHES } from '../patches.ts';

describe('applyEdits', () => {
  it('replaces each anchor exactly once', () => {
    expect(applyEdits('a\nb\nc\n', [{ find: 'b\n', replace: 'b\nB\n' }], 'f.ts')).toBe('a\nb\nB\nc\n');
  });

  it('normalises CRLF to LF first (the job repo is checked out with autocrlf)', () => {
    expect(applyEdits('a\r\nb\r\n', [{ find: 'a\nb', replace: 'x' }], 'f.ts')).toBe('x\n');
  });

  it('fails with the file name when an anchor is missing (backend code changed: update the patch)', () => {
    expect(() => applyEdits('a\n', [{ find: 'zzz', replace: '' }], 'src/lib/otp.ts')).toThrow(
      /src\/lib\/otp\.ts.*zzz/s,
    );
  });

  it('fails when an anchor appears more than once', () => {
    expect(() => applyEdits('x x', [{ find: 'x', replace: 'y' }], 'f.ts')).toThrow(/more than once/);
  });

  it('applies edits in order', () => {
    const edits = [
      { find: 'a', replace: 'b' },
      { find: 'b', replace: 'c' },
    ];
    expect(applyEdits('a', edits, 'f.ts')).toBe('c');
  });
});

describe('OTP test-mode patch (D3)', () => {
  const otp = PATCHES.find((p) => p.file === 'src/lib/otp.ts');

  it('exists', () => {
    expect(otp).toBeDefined();
  });

  it('only touches the OTP code and the OTP rate limiter', () => {
    expect(PATCHES.map((p) => p.file)).toEqual(['src/lib/otp.ts', 'src/index.ts']);
  });

  it('short-circuits sendOTP, verifyOTP and resendOTP for test numbers', () => {
    // A minimal stand-in with the same function headers as ../job/backend/src/lib/otp.ts
    const source = [
      "const BASE_URL = 'https://www.fast2sms.com/dev/otp';",
      'export async function sendOTP(mobile: string, options: OTPOptions = {}): Promise<Fast2SMSResponse> {',
      '  real();',
      '}',
      'export async function verifyOTP(mobile: string, otp: string): Promise<Fast2SMSResponse> {',
      '  real();',
      '}',
      'export async function resendOTP(mobile: string): Promise<Fast2SMSResponse> {',
      '  real();',
      '}',
      '',
    ].join('\r\n');
    const out = applyEdits(source, otp!.edits, otp!.file);
    expect(out).toContain("from './otpTestMode'");
    expect(out.match(/if \(isOtpTestNumber\(mobile\)\)/g)).toHaveLength(3);
    expect(out).toContain("if (otp === TEST_OTP) return testModeResponse('OTP verified');");
    // The website's verify routes answer 400 "Invalid or expired OTP" for any OTP failure.
    expect(out).toContain("throw new OTPError('Invalid or expired OTP', 400);");
  });
});

describe('OTP rate limit patch (E2E runs need more than 5 OTP requests per 15 min)', () => {
  const index = PATCHES.find((p) => p.file === 'src/index.ts');
  const source = [
    'const otpLimiter = rateLimit({',
    '  windowMs: 15 * 60 * 1000, // 15 minutes',
    '  max: 5, // 5 OTPs per 15 minutes',
    "  message: { error: 'Too many OTP requests, please try again after 15 minutes' },",
    '});',
    '',
  ].join('\r\n');

  it('raises the limit only in OTP test mode outside production, keeping 5 otherwise', () => {
    const out = applyEdits(source, index!.edits, index!.file);
    expect(out).toContain(
      "max: process.env.OTP_TEST_MODE === 'true' && process.env.NODE_ENV !== 'production' ? 100 : 5,",
    );
    expect(out).not.toContain('max: 5, // 5 OTPs');
    expect(out).toContain('Too many OTP requests, please try again after 15 minutes');
  });
});
