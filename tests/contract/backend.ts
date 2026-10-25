// Shared setup for contract tests: our real client and schemas against the local reference backend.
import { createApiClient } from '@/api/createApiClient';

export const BASE_URL = process.env.CONTRACT_API_URL ?? 'http://localhost:3000';

if (/onrender\.com|apronhanger\.work/.test(BASE_URL)) {
  throw new Error('Contract tests must never run against production (CLAUDE.md: Safety).');
}

export function contractClient() {
  return createApiClient({ baseUrl: BASE_URL, appVersion: 'contract-test', platform: 'node' });
}

/** Seed accounts and OTP test numbers (scripts/backend-local/overlay/app-scripts/seedData.ts, .env.local). */
export const SEED = {
  password: 'Test@1234',
  candidateEmail: 'candidate@apronhanger.test',
  recruiterEmail: 'recruiter@apronhanger.test',
  candidateMobile: '9000000001',
  /** Freed by every seed; the Maestro signup flow uses 9000000002. */
  signupMobile: '9000000003',
  otp: '123456',
};
