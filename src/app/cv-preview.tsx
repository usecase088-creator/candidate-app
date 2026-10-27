import { CvPreviewScreen } from '@/features/cv/CvPreviewScreen';
import { RequireSession } from '@/features/auth/RequireSession';

export default function CvPreviewRoute() {
  return (
    <RequireSession>
      <CvPreviewScreen />
    </RequireSession>
  );
}
