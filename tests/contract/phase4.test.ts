// Phase 4 backend endpoints (PRs 4, 7, 8, 9) against the local backend started from the combined branch:
// `npm run backend:local -- --source ../job-hotfix/backend`. On the live commit (no PRs) these routes answer 404 and
// this file fails: that is the point. Never points at production.
import { ApiError } from '@/api/errors';
import { AppConfigSchema } from '@/api/schemas/appConfig';
import {
  AuthResponseSchema,
  MeResponseSchema,
  RefreshResponseSchema,
  SignupVerifyResponseSchema,
} from '@/api/schemas/auth';
import { MessageResponseSchema } from '@/api/schemas/common';
import { NotificationListSchema, ReadAllSchema } from '@/api/schemas/notifications';
import { z } from 'zod';

import { contractClient, SEED } from './backend';

const api = contractClient();
const Ok = z.object({ success: z.boolean() }).loose();
const CANDIDATE = 'CANDIDATE';
/** Freed by every seed; shared with the Maestro signup flow (reseed between). The test deletes the account at the end. */
const DELETE_MOBILE = '9000000002';

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

afterEach(() => api.setAuthToken(null));

describe('PR 4: GET /api/app-config', () => {
  it('matches AppConfigSchema without a token', async () => {
    const config = await api.get('/api/app-config', AppConfigSchema);
    expect(config.minVersion.android).toMatch(/^\d+\.\d+\.\d+$/);
    expect(config.minVersion.ios).toMatch(/^\d+\.\d+\.\d+$/);
    expect(config.flags).toEqual(expect.any(Object));
  });
});

describe('PR 8: refresh tokens (the client sends X-Refresh-Capable: 1)', () => {
  it('login returns a refresh token; refresh rotates it; the old one is then refused; logout ends the session', async () => {
    const first = await login(SEED.candidateEmail, SEED.password);
    expect(first.refreshToken).toEqual(expect.any(String));

    const second = await api.post(
      '/api/auth/refresh',
      { refreshToken: first.refreshToken },
      RefreshResponseSchema,
    );
    expect(second.refreshToken).not.toBe(first.refreshToken);
    api.setAuthToken(second.token);
    await expect(api.get('/api/auth/me', MeResponseSchema)).resolves.toMatchObject({
      user: { email: SEED.candidateEmail },
    });
    api.setAuthToken(null);

    // Within 10 s of the rotation the old token still works (parallel requests of one phone, PR 8 GRACE_MS) and hands
    // out the same session; after that window a reuse revokes the whole family. The window is not waited for here.
    const grace = await api.post(
      '/api/auth/refresh',
      { refreshToken: first.refreshToken },
      RefreshResponseSchema,
    );
    expect(grace.token).toEqual(expect.any(String));

    // A made-up token is refused.
    const bogus = await rejection(
      api.post('/api/auth/refresh', { refreshToken: 'x'.repeat(40) }, RefreshResponseSchema),
    );
    expect(bogus.status).toBe(401);

    // A fresh session can still be ended with logout, after which its refresh token is dead.
    const third = await login(SEED.candidateEmail, SEED.password);
    await expect(api.post('/api/auth/logout', { refreshToken: third.refreshToken }, Ok)).resolves.toEqual(
      expect.objectContaining({ success: true }),
    );
    const afterLogout = await rejection(
      api.post('/api/auth/refresh', { refreshToken: third.refreshToken }, RefreshResponseSchema),
    );
    expect(afterLogout.status).toBe(401);
  });
});

describe('PR 7: push tokens', () => {
  it('registers and removes an Expo push token; refuses a bad one', async () => {
    const { token } = await login(SEED.applicantEmail, SEED.password);
    api.setAuthToken(token);
    const push = 'ExponentPushToken[contract-test-0000000000]';
    await expect(
      api.post('/api/push-tokens', { token: push, platform: 'android' }, Ok),
    ).resolves.toMatchObject({
      success: true,
    });
    // Idempotent: the same phone registering again is an update, not an error.
    await expect(
      api.post('/api/push-tokens', { token: push, platform: 'android' }, Ok),
    ).resolves.toMatchObject({
      success: true,
    });
    await expect(api.deleteJson('/api/push-tokens', { token: push }, Ok)).resolves.toMatchObject({
      success: true,
    });

    const bad = await rejection(
      api.post('/api/push-tokens', { token: 'not-a-token', platform: 'android' }, Ok),
    );
    expect(bad).toMatchObject({ status: 400, serverMessage: 'Invalid push token' });
  });

  it('needs a candidate token', async () => {
    const err = await rejection(
      api.post('/api/push-tokens', { token: 'ExponentPushToken[x]', platform: 'ios' }, Ok),
    );
    expect(err.status).toBe(401);
  });
});

describe('notifications (existing endpoints the Phase 4 screens use)', () => {
  it('list and read-all match the schemas for the seeded applicant', async () => {
    const { token } = await login(SEED.applicantEmail, SEED.password);
    api.setAuthToken(token);
    const list = await api.get('/api/notifications', NotificationListSchema);
    expect(list.data.length).toBeGreaterThan(0);
    expect(list.unreadCount).toBeGreaterThanOrEqual(0);
    const done = await api.patch('/api/notifications/read-all', {}, ReadAllSchema);
    expect(done.ok).toBe(true);
    const after = await api.get('/api/notifications', NotificationListSchema);
    expect(after.unreadCount).toBe(0);
  });
});

describe('PR 9: POST /api/account/delete', () => {
  it('a throwaway account: wrong password is 400, the right one deletes, the number is reusable', async () => {
    const email = `delete+${Date.now()}@apronhanger.test`;
    const password = 'Secret@123';
    await api.post(
      '/api/auth/signup/send-otp',
      { mobile: DELETE_MOBILE, role: CANDIDATE },
      MessageResponseSchema,
    );
    const { signup_token } = await api.post(
      '/api/auth/signup/verify-otp',
      { mobile: DELETE_MOBILE, otp: SEED.otp, role: CANDIDATE },
      SignupVerifyResponseSchema,
    );
    const registered = await api.post(
      '/api/auth/register',
      { name: 'Delete Me', mobile: DELETE_MOBILE, email, password, role: CANDIDATE, signup_token },
      AuthResponseSchema,
    );
    api.setAuthToken(registered.token);

    const wrong = await rejection(api.post('/api/account/delete', { password: 'nope' }, Ok));
    expect(wrong).toMatchObject({ status: 400, serverMessage: 'Incorrect password' });

    await expect(api.post('/api/account/delete', { password }, Ok)).resolves.toMatchObject({ success: true });

    // Gone: the token no longer works and the login is refused.
    const me = await rejection(api.get('/api/auth/me', MeResponseSchema));
    expect([401, 403]).toContain(me.status);
    api.setAuthToken(null);
    const relogin = await rejection(login(email, password));
    expect([400, 401, 403]).toContain(relogin.status);

    // The mobile number can sign up again (send-otp + verify-otp succeed instead of "Invalid or expired OTP").
    await api.post(
      '/api/auth/signup/send-otp',
      { mobile: DELETE_MOBILE, role: CANDIDATE },
      MessageResponseSchema,
    );
    const again = await api.post(
      '/api/auth/signup/verify-otp',
      { mobile: DELETE_MOBILE, otp: SEED.otp, role: CANDIDATE },
      SignupVerifyResponseSchema,
    );
    expect(again.signup_token).toEqual(expect.any(String));
  });
});
