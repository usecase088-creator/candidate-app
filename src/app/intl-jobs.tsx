import { RequireSession } from '@/features/auth/RequireSession';
import { IntlJobsScreen } from '@/features/jobs/screens/IntlJobsScreen';

export default function IntlJobsRoute() {
  return (
    <RequireSession>
      <IntlJobsScreen />
    </RequireSession>
  );
}
