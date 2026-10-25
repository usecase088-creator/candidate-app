import { ApiError } from '@/api/errors';

import {
  FORGOT_NETWORK_ERROR,
  loginErrorMessage,
  ROLE_MISMATCH_MESSAGE,
  SESSION_EXPIRED_MESSAGE,
  signOutNotice,
} from '../messages';

// ../job/candidates/src/lib/authMessages.ts and SCREENS.md.
describe('loginErrorMessage', () => {
  it.each([
    [401, { error: 'Invalid email or password' }, 'Invalid email or password. Please try again.'],
    [400, { error: 'email and password are required' }, 'email and password are required'],
    [400, {}, 'Please check your email and password.'],
    [409, { error: 'Email is already registered' }, 'Email is already registered'],
    [409, {}, 'This email is already registered.'],
    [500, { error: 'Login failed' }, 'Server error. Please try again in a moment.'],
    [503, {}, 'Server error. Please try again in a moment.'],
    [
      403,
      { error: 'Your account has been suspended. Please contact support.' },
      'Your account has been suspended. Please contact support.',
    ],
    [
      429,
      { error: 'Too many login attempts, please try again after 15 minutes' },
      'Too many login attempts, please try again after 15 minutes',
    ],
    [403, {}, 'Something went wrong. Please try again.'],
  ])('%i %o → %s', (status, body, message) => {
    expect(loginErrorMessage(ApiError.fromHttp(status, body))).toBe(message);
  });

  it('network and timeout use the website network message', () => {
    expect(loginErrorMessage(ApiError.network())).toBe(
      'Network error. Please check your connection and try again.',
    );
    expect(loginErrorMessage(ApiError.timeout())).toBe(
      'Network error. Please check your connection and try again.',
    );
  });

  it('an unexpected response or bug is a generic error', () => {
    expect(loginErrorMessage(ApiError.parse(200, '/x', []))).toBe('Something went wrong. Please try again.');
    expect(loginErrorMessage(new Error('boom'))).toBe('Something went wrong. Please try again.');
  });
});

describe('fixed messages', () => {
  it('role mismatch is the website text', () => {
    expect(ROLE_MISMATCH_MESSAGE).toBe(
      'This email is registered as a recruiter account. Please sign in on the Recruiter Portal instead.',
    );
  });

  it('forgot password network error is the website text', () => {
    expect(FORGOT_NETWORK_ERROR).toBe('Network error. Please try again.');
  });
});

describe('signOutNotice (D18)', () => {
  it('explains an expired session', () => {
    expect(signOutNotice('expired')).toBe(SESSION_EXPIRED_MESSAGE);
    expect(SESSION_EXPIRED_MESSAGE).toBe('Your session has expired. Please sign in again.');
  });

  it('shows the backend message for a blocked account', () => {
    expect(signOutNotice('blocked', 'Account not found.')).toBe('Account not found.');
    expect(signOutNotice('blocked')).toBe(SESSION_EXPIRED_MESSAGE);
  });

  it('says nothing after a normal sign-out or on first start', () => {
    expect(signOutNotice('user')).toBeUndefined();
    expect(signOutNotice(undefined)).toBeUndefined();
  });
});
