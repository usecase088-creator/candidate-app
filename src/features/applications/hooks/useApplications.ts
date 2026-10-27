// The candidate's applications, newest first (website: sortApplications). Failures are shown by each screen (queryView).
import { useQuery } from '@tanstack/react-query';

import { MATCH_PROFILE_KEY } from '@/features/jobs/hooks/queryKeys';
import { jobsApi } from '@/features/jobs/jobsApi';

import { applicationsApi } from '../applicationsApi';
import { sortNewestFirst } from '../logic/status';
import { APPLICATIONS_KEY } from './queryKeys';

export const useApplications = () =>
  useQuery({ queryKey: APPLICATIONS_KEY, queryFn: applicationsApi.list, select: sortNewestFirst });

/**
 * The candidate row with the saved profile, for quick apply and CV apply. Same cache entry as the match profile of
 * Phase 2, but always checked again when an apply screen opens: the profile is sent back to the server as it is.
 */
export const useApplyProfile = () =>
  useQuery({ queryKey: MATCH_PROFILE_KEY, queryFn: jobsApi.me, staleTime: 0 });
