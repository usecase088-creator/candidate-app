import { useQuery } from '@tanstack/react-query';

import { jobsApi } from '@/features/jobs/jobsApi';

export const CANDIDATE_ME_KEY = ['candidate', 'me'] as const;

/** The signed-in candidate's own record (name, avatar, profile JSON). Profile tab and the builder share it. */
export const useCandidateMe = () => useQuery({ queryKey: CANDIDATE_ME_KEY, queryFn: jobsApi.me });
