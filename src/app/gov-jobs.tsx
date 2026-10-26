import { RequireSession } from '@/features/auth/RequireSession';
import { GovJobsScreen } from '@/features/jobs/screens/GovJobsScreen';

export default function GovJobsRoute() {
  return (
    <RequireSession>
      <GovJobsScreen />
    </RequireSession>
  );
}
