import { RequireSession } from '@/features/auth/RequireSession';
import { SavedJobsScreen } from '@/features/jobs/screens/SavedJobsScreen';

export default function SavedJobsRoute() {
  return (
    <RequireSession>
      <SavedJobsScreen />
    </RequireSession>
  );
}
