// Mounted once at the root: shows notifications that arrive while the app is open, and opens the right screen when the
// user taps one (also the one that started the app). All routes come from src/lib/linking.ts; anything it does not
// know is ignored.
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';

import { useSession } from '@/features/auth/sessionStore';
import { resolvePushData } from '@/lib/linking';

type Response = { notification?: { request?: { content?: { data?: unknown } } } } | null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** The notification that started the app is looked at once per launch, not again after a later sign-in. */
let startupChecked = false;

/** Jest only. */
export function resetPushListenerForTests() {
  startupChecked = false;
}

export function PushListener() {
  const router = useRouter();
  const signedIn = useSession((s) => s.status === 'signedIn');

  useEffect(() => {
    if (!signedIn) return;
    const open = (response: Response) => {
      const route = resolvePushData(response?.notification?.request?.content?.data);
      if (route) router.push(route as never);
    };
    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    if (!startupChecked) {
      startupChecked = true;
      void Notifications.getLastNotificationResponseAsync()
        .then(open)
        .catch(() => undefined);
    }
    return () => subscription.remove();
  }, [signedIn, router]);

  return null;
}
