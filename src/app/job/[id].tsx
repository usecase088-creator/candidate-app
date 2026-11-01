import { AfterRestore } from '@/features/auth/RequireSession';
import { JobDetailsScreen } from '@/features/jobs/screens/JobDetailsScreen';

// Open to a signed-out visitor too (website /jobs/:id has no sign-in guard); save and apply ask to sign in.
export default function JobRoute() {
  return (
    <AfterRestore>
      <JobDetailsScreen />
    </AfterRestore>
  );
}
