import { RequireSession } from '@/features/auth/RequireSession';
import { JobDetailsScreen } from '@/features/jobs/screens/JobDetailsScreen';

export default function JobRoute() {
  return (
    <RequireSession>
      <JobDetailsScreen />
    </RequireSession>
  );
}
