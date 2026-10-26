import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import type { Job } from '@/api/schemas/jobs';

/** Opens the job details screen. */
export function useOpenJob() {
  const router = useRouter();
  return useCallback(
    (job: Pick<Job, 'id'>) => router.push({ pathname: '/job/[id]', params: { id: job.id } }),
    [router],
  );
}
