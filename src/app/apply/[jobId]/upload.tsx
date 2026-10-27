import { ApplyUploadScreen } from '@/features/applications/screens/ApplyUploadScreen';
import { RequireSession } from '@/features/auth/RequireSession';

export default function ApplyUploadRoute() {
  return (
    <RequireSession>
      <ApplyUploadScreen />
    </RequireSession>
  );
}
