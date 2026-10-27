import { RequireSession } from '@/features/auth/RequireSession';
import { ApplyChooserScreen } from '@/features/applications/screens/ApplyChooserScreen';

export default function ApplyChooserRoute() {
  return (
    <RequireSession>
      <ApplyChooserScreen />
    </RequireSession>
  );
}
