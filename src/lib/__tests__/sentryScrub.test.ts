import type { Breadcrumb, ErrorEvent } from '@sentry/react-native';

import { scrubBreadcrumb, scrubEvent, scrubText } from '../sentryScrub';

const JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyIsImVtYWlsIjoiYUBiLmNvbSJ9.c2lnbmF0dXJlLXZhbHVlLWhlcmU';

describe('scrubText', () => {
  it.each([
    ['an email', 'Login failed for asha.rao+test@gmail.com today', 'Login failed for [email] today'],
    ['a 10-digit mobile', 'OTP sent to 9876543210', 'OTP sent to [phone]'],
    ['a +91 mobile with spaces', 'call +91 98765 43210 now', 'call [phone] now'],
    ['a 91-prefixed mobile', 'mobile 919876543210', 'mobile [phone]'],
    ['a JWT', `token ${JWT} end`, 'token [token] end'],
    ['a bearer header value', 'Bearer abc.def-123', 'Bearer [token]'],
  ])('removes %s', (_label, input, expected) => {
    expect(scrubText(input)).toBe(expected);
  });

  it.each([
    ['UUIDs', 'job 5eed0000-0000-4000-8000-000000000001 missing'],
    ['timestamps', 'at 1761384600000 ms'],
    ['HTTP statuses and short numbers', 'status 401 after 20000 ms'],
    ['API paths', 'GET /api/jobs/5eed0000-0000-4000-8000-00000000b001'],
  ])('keeps %s', (_label, input) => {
    expect(scrubText(input)).toBe(input);
  });
});

describe('scrubEvent', () => {
  it('drops request bodies, cookies, auth headers and query strings', () => {
    const event = {
      request: {
        url: 'http://localhost:3000/api/auth/login?email=a@b.com',
        data: { email: 'a@b.com', password: 'Secret@123' },
        cookies: { sid: 'x' },
        query_string: 'email=a@b.com',
        headers: { Authorization: `Bearer ${JWT}`, 'X-Platform': 'android' },
      },
    } as unknown as ErrorEvent;
    const out = scrubEvent(event);
    expect(out.request).toEqual({
      url: 'http://localhost:3000/api/auth/login',
      headers: { 'X-Platform': 'android' },
    });
  });

  it('keeps only the user id', () => {
    const out = scrubEvent({
      user: { id: 'u1', email: 'a@b.com', username: 'asha', ip_address: '1.2.3.4' },
    } as ErrorEvent);
    expect(out.user).toEqual({ id: 'u1' });
  });

  it('scrubs exception messages and nested extra/contexts, and filters sensitive keys', () => {
    const out = scrubEvent({
      message: 'Failed for 9876543210',
      exception: { values: [{ type: 'ApiError', value: 'Email asha@x.com is already registered' }] },
      extra: { form: { mobile: '9876543210', otp: '123456', note: 'mail me at asha@x.com' }, count: 3 },
      contexts: { auth: { signup_token: 'abc', reset_token: 'def', name: 'Asha Rao' } },
    } as unknown as ErrorEvent);
    expect(out.message).toBe('Failed for [phone]');
    expect(out.exception?.values?.[0].value).toBe('Email [email] is already registered');
    expect(out.extra).toEqual({
      form: { mobile: '[filtered]', otp: '[filtered]', note: 'mail me at [email]' },
      count: 3,
    });
    expect(out.contexts).toEqual({
      auth: { signup_token: '[filtered]', reset_token: '[filtered]', name: '[filtered]' },
    });
  });

  it('scrubs breadcrumbs attached to the event', () => {
    const out = scrubEvent({ breadcrumbs: [{ message: 'typed asha@x.com' }] } as ErrorEvent);
    expect(out.breadcrumbs?.[0].message).toBe('typed [email]');
  });

  it('keeps an ApiError parse report useful (path, issues)', () => {
    const out = scrubEvent({
      extra: {
        path: '/api/auth/me',
        issues: ['user.email: Invalid input: expected string, received number'],
      },
    } as unknown as ErrorEvent);
    expect(out.extra).toEqual({
      path: '/api/auth/me',
      issues: ['user.email: Invalid input: expected string, received number'],
    });
  });
});

describe('scrubBreadcrumb', () => {
  it('removes query strings and bodies from fetch breadcrumbs', () => {
    const crumb: Breadcrumb = {
      category: 'fetch',
      data: {
        url: 'http://localhost:3000/api/search?q=asha@x.com',
        method: 'GET',
        status_code: 200,
        body: '{"a":1}',
      },
    };
    expect(scrubBreadcrumb(crumb)?.data).toEqual({
      url: 'http://localhost:3000/api/search',
      method: 'GET',
      status_code: 200,
    });
  });

  it('scrubs console breadcrumb messages', () => {
    expect(scrubBreadcrumb({ category: 'console', message: 'user 9876543210' })?.message).toBe(
      'user [phone]',
    );
  });

  it('drops text input breadcrumbs entirely', () => {
    expect(scrubBreadcrumb({ category: 'ui.input', message: 'asha' })).toBeNull();
  });
});
