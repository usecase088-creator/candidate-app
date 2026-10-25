import { Redirect, Stack } from 'expo-router';

import { useSession } from '@/features/auth/sessionStore';

// A deep link straight to /signup or /forgot-password still has Login underneath, so Back works.
export const unstable_settings = { anchor: 'login' };

/** Signed-out screens. A signed-in user is sent to the tabs (replace: Back can't return here). */
export default function AuthLayout() {
  const status = useSession((s) => s.status);
  if (status === 'restoring') return null; // splash is still up
  if (status === 'signedIn') return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
