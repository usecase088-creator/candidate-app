// Local-only edits applied to the .reference-backend copy (never to ../job). Each edit replaces one exact
// anchor; if the job repo changes and an anchor disappears, the run stops and names the file to update here.

export type Edit = { find: string; replace: string };
export type Patch = { file: string; why: string; edits: Edit[] };

export function applyEdits(source: string, edits: Edit[], file: string): string {
  let text = source.replace(/\r\n/g, '\n');
  for (const { find, replace } of edits) {
    const first = text.indexOf(find);
    if (first === -1) throw new Error(`Patch for ${file} no longer applies: anchor not found:\n${find}`);
    if (text.indexOf(find, first + 1) !== -1) {
      throw new Error(`Patch for ${file}: anchor appears more than once:\n${find}`);
    }
    text = text.slice(0, first) + replace + text.slice(first + find.length);
  }
  return text;
}

const SEND =
  'export async function sendOTP(mobile: string, options: OTPOptions = {}): Promise<Fast2SMSResponse> {\n';
const VERIFY = 'export async function verifyOTP(mobile: string, otp: string): Promise<Fast2SMSResponse> {\n';
const RESEND = 'export async function resendOTP(mobile: string): Promise<Fast2SMSResponse> {\n';

export const PATCHES: Patch[] = [
  {
    file: 'src/lib/otp.ts',
    why: 'D3: OTP 123456 for OTP_TEST_NUMBERS when OTP_TEST_MODE=true (never in production); no SMS sent.',
    edits: [
      {
        find: "const BASE_URL = '",
        replace:
          '// LOCAL-ONLY PATCH from apronhanger-app scripts/backend-local/patches.ts (D3).\n' +
          "import { isOtpTestNumber, TEST_OTP, testModeResponse } from './otpTestMode';\n\n" +
          "const BASE_URL = '",
      },
      { find: SEND, replace: SEND + "  if (isOtpTestNumber(mobile)) return testModeResponse('OTP sent');\n" },
      {
        find: VERIFY,
        replace:
          VERIFY +
          '  if (isOtpTestNumber(mobile)) {\n' +
          "    if (otp === TEST_OTP) return testModeResponse('OTP verified');\n" +
          "    throw new OTPError('Invalid or expired OTP', 400);\n" +
          '  }\n',
      },
      {
        find: RESEND,
        replace: RESEND + "  if (isOtpTestNumber(mobile)) return testModeResponse('OTP resent');\n",
      },
    ],
  },
  {
    file: 'src/index.ts',
    why: 'E2E: OTP limit 100 instead of 5 per 15 min in OTP test mode, so all auth flows can run in one go.',
    edits: [
      {
        find: '  max: 5, // 5 OTPs per 15 minutes\n',
        replace:
          '  // LOCAL-ONLY PATCH from apronhanger-app scripts/backend-local/patches.ts: room for E2E runs in test mode.\n' +
          "  max: process.env.OTP_TEST_MODE === 'true' && process.env.NODE_ENV !== 'production' ? 100 : 5,\n",
      },
    ],
  },
];
