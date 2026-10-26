// Read-only queries for the job screens. Failures are shown by each screen (queryView); nothing is retried by hand.
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import type { Job } from '@/api/schemas/jobs';

import { jobsApi } from '../jobsApi';
import { computeJobMatches, toMatchProfile } from '../logic/match';
import {
  GOV_JOBS_KEY,
  INTL_JOBS_KEY,
  JOBS_KEY,
  jobKey,
  MATCH_PROFILE_KEY,
  similarJobsKey,
} from './queryKeys';

/** Up to 50 active jobs, with `matchPercent` because the app always sends the candidate's token. */
export const useJobs = () => useQuery({ queryKey: JOBS_KEY, queryFn: jobsApi.list });

export const useJob = (id: string) => useQuery({ queryKey: jobKey(id), queryFn: () => jobsApi.get(id) });

/** Website: only when the job has a category. */
export const useSimilarJobs = (job: Pick<Job, 'id' | 'category'> | undefined) =>
  useQuery({
    queryKey: similarJobsKey(job?.category ?? '', job?.id ?? ''),
    queryFn: () => jobsApi.similar(job?.category ?? '', job?.id ?? ''),
    enabled: !!job?.category,
  });

export const useGovJobs = () => useQuery({ queryKey: GOV_JOBS_KEY, queryFn: jobsApi.govList });

export const useIntlJobs = () => useQuery({ queryKey: INTL_JOBS_KEY, queryFn: jobsApi.intlList });

/** The candidate's profile, only to rank "Recommended for you". If it fails the rail uses the server's score. */
export const useMatchProfile = () =>
  useQuery({
    queryKey: MATCH_PROFILE_KEY,
    queryFn: jobsApi.me,
    select: toMatchProfile,
    staleTime: 5 * 60_000,
  });

/** Website RecommendedRail: the 5 best matches. */
export function useRecommended(jobs: readonly Job[] | undefined) {
  const { data: profile } = useMatchProfile();
  return useMemo(() => computeJobMatches(jobs ?? [], profile).slice(0, 5), [jobs, profile]);
}
