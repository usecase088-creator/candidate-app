import { candidateUser, loginResponse, meResponse, recruiterUser } from '@/test/fixtures/auth';

import { AuthResponseSchema, AuthUserSchema, MeResponseSchema } from '../auth';

describe('AuthUserSchema', () => {
  it('accepts candidate and recruiter users (the screen rejects recruiters, not the schema)', () => {
    expect(AuthUserSchema.parse(candidateUser)).toMatchObject({ role: 'CANDIDATE' });
    expect(AuthUserSchema.parse(recruiterUser)).toMatchObject({ role: 'RECRUITER' });
  });

  it('accepts register responses, where hospitalId is left out and candidateId may be missing', () => {
    const { hospitalId: _h, candidateId: _c, ...bare } = candidateUser;
    expect(() => AuthUserSchema.parse(bare)).not.toThrow();
  });

  it.each(['id', 'email', 'name', 'role'] as const)('requires %s', (key) => {
    const { [key]: _drop, ...rest } = candidateUser;
    expect(AuthUserSchema.safeParse(rest).success).toBe(false);
  });

  it('keeps extra fields the backend adds', () => {
    expect(AuthUserSchema.parse({ ...candidateUser, plan: 'Basic' })).toHaveProperty('plan', 'Basic');
  });
});

describe('AuthResponseSchema (login and register)', () => {
  it('keeps the refresh token the app asks for', () => {
    expect(AuthResponseSchema.parse({ ...loginResponse, refreshToken: 'r1', expiresIn: 1800 })).toMatchObject(
      {
        refreshToken: 'r1',
      },
    );
    expect(AuthResponseSchema.parse(loginResponse).refreshToken).toBeUndefined();
  });

  it('parses a login response', () => {
    expect(AuthResponseSchema.parse(loginResponse)).toMatchObject({ token: 'test.jwt.token' });
  });

  it('rejects a missing or empty token', () => {
    expect(AuthResponseSchema.safeParse({ user: candidateUser }).success).toBe(false);
    expect(AuthResponseSchema.safeParse({ token: '', user: candidateUser }).success).toBe(false);
  });
});

describe('MeResponseSchema', () => {
  it('parses GET /api/auth/me', () => {
    expect(MeResponseSchema.parse(meResponse).user).toMatchObject({ email: 'candidate@apronhanger.test' });
  });

  it('rejects a body without user', () => {
    expect(MeResponseSchema.safeParse({}).success).toBe(false);
  });
});
