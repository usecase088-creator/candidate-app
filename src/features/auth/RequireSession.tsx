import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';

import { useSession } from './sessionStore';

/**
 * Guard for signed-in screens outside the tabs (job details, saved jobs, ...). Same rule as the tabs layout:
 * restoring shows nothing (the splash is up), signed out goes to login (replace: Back can't return).
 */
export function RequireSession({ children }: { children: ReactNode }) {
  const status = useSession((s) => s.status);
  if (status === 'restoring') return null;
  if (status === 'signedOut') return <Redirect href="/login" />;
  return <>{children}</>;
}
