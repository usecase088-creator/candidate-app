import { RequireSession } from '@/features/auth/RequireSession';
import { ApplyFormScreen } from '@/features/applications/screens/ApplyFormScreen';

export default function ApplyFormRoute() {
  return (
    <RequireSession>
      <ApplyFormScreen />
    </RequireSession>
  );
}
