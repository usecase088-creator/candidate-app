import { RequireSession } from '@/features/auth/RequireSession';
import { ProfileBuilderScreen } from '@/features/profile/screens/ProfileBuilderScreen';

export default function ProfileBuilderRoute() {
  return (
    <RequireSession>
      <ProfileBuilderScreen />
    </RequireSession>
  );
}
