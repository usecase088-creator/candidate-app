import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useSession } from '@/features/auth/sessionStore';
import { takeSignInTarget } from '@/features/auth/signInGate';

// A deep link straight to /signup or /forgot-password still has Login underneath, so Back works.
export const unstable_settings = { anchor: 'login' };

/**
 * Right after signing in: go back to the screen the visitor was heading for (a job, Saved jobs, ...), or Home.
 * dismissTo pops the sign-in screens off the stack, so Back can't return to them.
 */
function AfterSignIn() {
  const router = useRouter();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    // The target was checked against our own routes in signInGate; typed routes can't know that.
    const heading = (takeSignInTarget() ?? '/') as never;
    // Nothing under the sign-in screens (it was the first screen): replace it.
    if (router.canDismiss()) router.dismissTo(heading);
    else router.replace(heading);
  }, [router]);
  return null;
}

/** Signed-out screens. A signed-in user is sent on (replace: Back can't return here). */
export default function AuthLayout() {
  const status = useSession((s) => s.status);
  if (status === 'restoring') return null; // splash is still up
  if (status === 'signedIn') return <AfterSignIn />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
