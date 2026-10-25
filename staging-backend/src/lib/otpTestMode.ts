// Local-only OTP test mode (D3). Copied into .reference-backend by scripts/backend-local.ts and called from
// the patched src/lib/otp.ts (scripts/patches/otp-test-mode.patch). Never part of the job repo.

export const TEST_OTP = '123456';

type Env = Record<string, string | undefined>;

const digits = (s: string) => s.replace(/\D/g, '');

/** True only in non-production, with OTP_TEST_MODE=true, for a number listed in OTP_TEST_NUMBERS. */
export function isOtpTestNumber(mobile: string, env: Env = process.env): boolean {
  if (env.OTP_TEST_MODE !== 'true' || env.NODE_ENV === 'production') return false;
  const wanted = digits(mobile);
  if (!wanted) return false;
  return (env.OTP_TEST_NUMBERS ?? '')
    .split(',')
    .map(digits)
    .some((n) => n !== '' && n === wanted);
}

export function testModeResponse(message: string) {
  return { return: true, status_code: 200, message: `${message} (test mode)` };
}
