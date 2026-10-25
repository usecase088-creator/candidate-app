// Auth endpoints: the exact requests the app sends, parsed with the app's schemas (PHASE-1 Task 9).
// Run with `npm run test:contract` while `npm run backend:local` is up. Order matters (password reset is last).
import { ApiError } from '@/api/errors';
import {
  AuthResponseSchema,
  MeResponseSchema,
  ResetVerifyResponseSchema,
  SignupVerifyResponseSchema,
} from '@/api/schemas/auth';
import { MessageResponseSchema } from '@/api/schemas/common';

import { contractClient, SEED } from './backend';

const api = contractClient();
const CANDIDATE = 'CANDIDATE';

async function rejection(p: Promise<unknown>): Promise<ApiError> {
  try {
    await p;
  } catch (e) {
    if (e instanceof ApiError) return e;
    throw e;
  }
  throw new Error('expected the request to fail');
}

const login = (email: string, password: string) =>
  api.post('/api/auth/login', { email, password }, AuthResponseSchema);

describe('login and session', () => {
  afterEach(() => api.setAuthToken(null));

  it('POST /api/auth/login (candidate) matches AuthResponseSchema', async () => {
    const res = await login(SEED.candidateEmail, SEED.password);
    expect(res.user).toMatchObject({ email: SEED.candidateEmail, role: CANDIDATE });
  });

  it('GET /api/auth/me with the token matches MeResponseSchema', async () => {
    const { token } = await login(SEED.candidateEmail, SEED.password);
    api.setAuthToken(token);
    const me = await api.get('/api/auth/me', MeResponseSchema);
    expect(me.user).toMatchObject({ email: SEED.candidateEmail, role: CANDIDATE });
  });

  it('a recruiter login still parses, with role RECRUITER (the app rejects it)', async () => {
    expect((await login(SEED.recruiterEmail, SEED.password)).user.role).toBe('RECRUITER');
  });

  it('a wrong password is 401 with the backend message', async () => {
    const err = await rejection(login(SEED.candidateEmail, 'wrong'));
    expect(err).toMatchObject({ kind: 'http', status: 401, serverMessage: 'Invalid email or password' });
  });

  it('GET /api/auth/me without a token is 401', async () => {
    expect((await rejection(api.get('/api/auth/me', MeResponseSchema))).status).toBe(401);
  });
});

describe('signup (OTP test mode, D3)', () => {
  it('send-otp, wrong OTP, verify-otp, register, then /me', async () => {
    const email = `contract+${Date.now()}@apronhanger.test`;
    const sent = await api.post(
      '/api/auth/signup/send-otp',
      { mobile: SEED.signupMobile, role: CANDIDATE },
      MessageResponseSchema,
    );
    expect(sent.message).toBe('If this number is eligible for signup, an OTP has been sent.');

    const wrong = await rejection(
      api.post(
        '/api/auth/signup/verify-otp',
        { mobile: SEED.signupMobile, otp: '000000', role: CANDIDATE },
        SignupVerifyResponseSchema,
      ),
    );
    expect(wrong).toMatchObject({ status: 400, serverMessage: 'Invalid or expired OTP' });

    const { signup_token } = await api.post(
      '/api/auth/signup/verify-otp',
      { mobile: SEED.signupMobile, otp: SEED.otp, role: CANDIDATE },
      SignupVerifyResponseSchema,
    );
    const registered = await api.post(
      '/api/auth/register',
      {
        name: 'Contract Test',
        mobile: SEED.signupMobile,
        email,
        password: 'Secret@123',
        role: CANDIDATE,
        signup_token,
      },
      AuthResponseSchema,
    );
    expect(registered.user).toMatchObject({ email, role: CANDIDATE, name: 'Contract Test' });

    api.setAuthToken(registered.token);
    await expect(api.get('/api/auth/me', MeResponseSchema)).resolves.toMatchObject({ user: { email } });
    api.setAuthToken(null);
  });

  it('a number that already has an account fails verify with the website message', async () => {
    await api.post(
      '/api/auth/signup/send-otp',
      { mobile: SEED.candidateMobile, role: CANDIDATE },
      MessageResponseSchema,
    );
    const err = await rejection(
      api.post(
        '/api/auth/signup/verify-otp',
        { mobile: SEED.candidateMobile, otp: SEED.otp, role: CANDIDATE },
        SignupVerifyResponseSchema,
      ),
    );
    expect(err).toMatchObject({ status: 400, serverMessage: 'Invalid or expired OTP' });
  });
});

describe('forgot password (OTP test mode, D3)', () => {
  it('forgot-password, verify-otp (masked email), reset-password, then login', async () => {
    const asked = await api.post(
      '/api/auth/forgot-password',
      { mobile: SEED.candidateMobile, role: CANDIDATE },
      MessageResponseSchema,
    );
    expect(asked.message).toBe('If an account exists for this number, an OTP has been sent.');

    const verified = await api.post(
      '/api/auth/verify-otp',
      { mobile: SEED.candidateMobile, otp: SEED.otp, role: CANDIDATE },
      ResetVerifyResponseSchema,
    );
    expect(verified.maskedEmail).toBe('c***e@apronhanger.test');

    // Same password as the seed, so the other tests and flows keep working.
    await api.post(
      '/api/auth/reset-password',
      { reset_token: verified.reset_token, new_password: SEED.password, role: CANDIDATE },
      MessageResponseSchema,
    );
    await expect(login(SEED.candidateEmail, SEED.password)).resolves.toMatchObject({
      user: { role: CANDIDATE },
    });
  });
});
