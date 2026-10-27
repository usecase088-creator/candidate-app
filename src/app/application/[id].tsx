import { ApplicationDetailsScreen } from '@/features/applications/screens/ApplicationDetailsScreen';
import { RequireSession } from '@/features/auth/RequireSession';

export default function ApplicationRoute() {
  return (
    <RequireSession>
      <ApplicationDetailsScreen />
    </RequireSession>
  );
}
