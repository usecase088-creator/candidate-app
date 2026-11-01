// Guest browsing: a signed-out visitor sees the job feed and job details, and is asked to sign in only when they
// tap something that needs an account (website useAuthGate). The screen they were heading for is kept in memory
// (never in storage or a URL), checked against our own routes, and used once after a successful sign-in.
import { router } from 'expo-router';

const FIXED = new Set(['/', '/search', '/applications', '/profile', '/saved-jobs', '/gov-jobs', '/intl-jobs']);
const WITH_ID = /^\/(job|apply)\/[A-Za-z0-9_-]{1,100}$/;

let target: string | null = null;

/** A screen a guest can be on and come back to after signing in. */
export function isSignInTarget(path: string | undefined): path is string {
  return !!path && (FIXED.has(path) || WITH_ID.test(path));
}

function remember(heading?: string): void {
  target = isSignInTarget(heading) ? heading : null;
}

/** Opens sign-in. `heading`: where to go after signing in (a screen a guest can reach), or nothing for Home. */
export function goToSignIn(heading?: string): void {
  remember(heading);
  // navigate, not push: a second tap goes to the sign-in screen that is already open instead of stacking another.
  router.navigate('/login');
}

/** Same, for "Create an account". */
export function goToSignUp(heading?: string): void {
  remember(heading);
  router.navigate('/signup');
}

/** Remember where a visitor was heading when something else (a protected screen) already redirects to sign-in. */
export function rememberSignInTarget(heading?: string): void {
  remember(heading);
}

/** The remembered screen, once. Called by the signed-in switch of the (auth) layout. */
export function takeSignInTarget(): string | null {
  const t = target;
  target = null;
  return t;
}
