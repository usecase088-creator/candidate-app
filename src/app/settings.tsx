import { RequireSession } from '@/features/auth/RequireSession';
import { SettingsScreen } from '@/features/profile/screens/SettingsScreen';

export default function SettingsRoute() {
  return (
    <RequireSession>
      <SettingsScreen />
    </RequireSession>
  );
}
