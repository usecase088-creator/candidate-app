import { RequireSession } from '@/features/auth/RequireSession';
import { NotificationsScreen } from '@/features/notifications/screens/NotificationsScreen';

export default function NotificationsRoute() {
  return (
    <RequireSession>
      <NotificationsScreen />
    </RequireSession>
  );
}
