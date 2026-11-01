import { Redirect, usePathname } from 'expo-router';
import { type ReactNode, useEffect } from 'react';

import { useSession } from './sessionStore';
import { rememberSignInTarget } from './signInGate';

/**
 * Guard for the account screens outside the tabs (saved jobs, applying, settings, ...). Restoring shows nothing (the
 * splash is up); a visitor who is signed out goes to login (replace: Back can't return) and, after signing in, comes
 * back to this screen when a guest can reach it.
 */
export function RequireSession({ children }: { children: ReactNode }) {
  const status = useSession((s) => s.status);
  const pathname = usePathname();
  useEffect(() => {
    if (status === 'signedOut') rememberSignInTarget(pathname);
  }, [status, pathname]);
  if (status === 'restoring') return null;
  if (status === 'signedOut') return <Redirect href="/login" />;
  return <>{children}</>;
}

/** For screens a guest may open too (job details): wait for the saved session to be checked, then show the screen to everyone. */
export function AfterRestore({ children }: { children: ReactNode }) {
  const status = useSession((s) => s.status);
  if (status === 'restoring') return null;
  return <>{children}</>;
}
