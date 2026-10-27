import { DeleteAccountScreen } from '@/features/account/screens/DeleteAccountScreen';
import { RequireSession } from '@/features/auth/RequireSession';

export default function DeleteAccountRoute() {
  return (
    <RequireSession>
      <DeleteAccountScreen />
    </RequireSession>
  );
}
