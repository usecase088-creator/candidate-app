// A signed-out visitor who taps something that needs an account is sent to sign-in and brought back afterwards
// (website useAuthGate: /auth?mode=signin&redirect=...). The target is kept in memory only and must be one of our own screens.
import { router } from 'expo-router';

import { goToSignIn, takeSignInTarget } from '../signInGate';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

beforeEach(() => {
  jest.clearAllMocks();
  takeSignInTarget();
});

describe('goToSignIn', () => {
  it('opens sign-in and remembers where the visitor was heading', () => {
    goToSignIn('/job/abc123');
    expect(router.push).toHaveBeenCalledWith('/login');
    expect(takeSignInTarget()).toBe('/job/abc123');
  });

  it.each(['/', '/search', '/applications', '/profile', '/saved-jobs', '/gov-jobs', '/intl-jobs', '/apply/job-1'])(
    'accepts our own screen %s',
    (target) => {
      goToSignIn(target);
      expect(takeSignInTarget()).toBe(target);
    },
  );

  it.each([
    'https://evil.example/x',
    '//evil.example',
    'javascript:alert(1)',
    '/job/../../etc',
    '/job/a/b',
    '/delete-account',
    '/settings',
    '',
  ])('forgets a target that is not one of our guest-reachable screens: %s', (target) => {
    goToSignIn(target);
    expect(router.push).toHaveBeenCalledWith('/login');
    expect(takeSignInTarget()).toBeNull();
  });

  it('without a target, clears an old one (a later plain "Sign in" must not jump somewhere stale)', () => {
    goToSignIn('/job/abc');
    goToSignIn();
    expect(takeSignInTarget()).toBeNull();
  });
});

describe('takeSignInTarget', () => {
  it('gives the target once', () => {
    goToSignIn('/saved-jobs');
    expect(takeSignInTarget()).toBe('/saved-jobs');
    expect(takeSignInTarget()).toBeNull();
  });
});
