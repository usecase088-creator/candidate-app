// TanStack Query keys for the job features. Everything is cleared on sign-out (root layout).
export const JOBS_KEY = ['jobs'] as const;
export const jobKey = (id: string) => ['jobs', 'detail', id] as const;
export const similarJobsKey = (category: string, excludeId: string) =>
  ['jobs', 'similar', category, excludeId] as const;
export const SAVED_JOBS_KEY = ['saved-jobs'] as const;
export const GOV_JOBS_KEY = ['gov-jobs'] as const;
export const INTL_JOBS_KEY = ['intl-jobs'] as const;
export const MATCH_PROFILE_KEY = ['candidate', 'match-profile'] as const;
