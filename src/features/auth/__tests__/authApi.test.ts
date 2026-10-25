import { http, HttpResponse, type JsonBodyType } from 'msw';

import { candidateUser, loginResponse } from '@/test/fixtures/auth';
import { API } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';

import { authApi } from '../authApi';

/** Replies with `body` and records the JSON the app sent. */
function post(path: string, body: JsonBodyType, status = 200) {
  const sent: unknown[] = [];
  server.use(
    http.post(`${API}${path}`, async ({ request }) => {
      sent.push(await request.json());
      return HttpResponse.json(body, { status });
    }),
  );
  return sent;
}

it('login sends email and password as typed', async () => {
  const sent = post('/api/auth/login', loginResponse);
  await expect(authApi.login({ email: 'Asha@X.com', password: 'p' })).resolves.toMatchObject({
    token: 'test.jwt.token',
    user: { role: 'CANDIDATE' },
  });
  expect(sent[0]).toEqual({ email: 'Asha@X.com', password: 'p' });
});

it('sendSignupOtp sends the mobile as typed, as a CANDIDATE', async () => {
  const sent = post('/api/auth/signup/send-otp', {
    message: 'If this number is eligible for signup, an OTP has been sent.',
  });
  await authApi.sendSignupOtp('+91 98765 43210');
  expect(sent[0]).toEqual({ mobile: '+91 98765 43210', role: 'CANDIDATE' });
});

it('verifySignupOtp returns the signup token', async () => {
  const sent = post('/api/auth/signup/verify-otp', { message: 'OTP verified', signup_token: 'a'.repeat(64) });
  await expect(authApi.verifySignupOtp('9000000002', '123456')).resolves.toBe('a'.repeat(64));
  expect(sent[0]).toEqual({ mobile: '9000000002', otp: '123456', role: 'CANDIDATE' });
});

it('register sends the signup draft with the token and returns the session', async () => {
  const sent = post('/api/auth/register', { token: 't', user: candidateUser }, 201);
  await expect(
    authApi.register({
      name: 'Asha Rao',
      mobile: '9000000002',
      email: 'asha@x.com',
      password: 'Secret@123',
      signupToken: 'tok',
    }),
  ).resolves.toMatchObject({ token: 't' });
  expect(sent[0]).toEqual({
    name: 'Asha Rao',
    mobile: '9000000002',
    email: 'asha@x.com',
    password: 'Secret@123',
    role: 'CANDIDATE',
    signup_token: 'tok',
  });
});

it('forgotPassword, verifyResetOtp and resetPassword follow the backend contract', async () => {
  const s1 = post('/api/auth/forgot-password', {
    message: 'If an account exists for this number, an OTP has been sent.',
  });
  const s2 = post('/api/auth/verify-otp', {
    message: 'OTP verified',
    reset_token: 'r',
    maskedEmail: 'c***e@apronhanger.test',
  });
  const s3 = post('/api/auth/reset-password', { message: 'Password reset successfully' });

  await authApi.forgotPassword('9000000001');
  await expect(authApi.verifyResetOtp('9000000001', '123456')).resolves.toEqual({
    resetToken: 'r',
    maskedEmail: 'c***e@apronhanger.test',
  });
  await authApi.resetPassword('r', 'Secret@123');

  expect(s1[0]).toEqual({ mobile: '9000000001', role: 'CANDIDATE' });
  expect(s2[0]).toEqual({ mobile: '9000000001', otp: '123456', role: 'CANDIDATE' });
  expect(s3[0]).toEqual({ reset_token: 'r', new_password: 'Secret@123', role: 'CANDIDATE' });
});

it('rejects a verify response without a token (parse error, not a silent success)', async () => {
  post('/api/auth/signup/verify-otp', { message: 'OTP verified' });
  await expect(authApi.verifySignupOtp('9000000002', '123456')).rejects.toMatchObject({ kind: 'parse' });
});

it('passes backend errors through as ApiError', async () => {
  post('/api/auth/signup/verify-otp', { error: 'Invalid or expired OTP' }, 400);
  await expect(authApi.verifySignupOtp('9000000002', '000000')).rejects.toMatchObject({
    kind: 'http',
    status: 400,
    serverMessage: 'Invalid or expired OTP',
  });
});
