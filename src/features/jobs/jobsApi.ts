// Job endpoints the candidate website calls (docs/reference/API.md §8, 10-16). Read-only except save/unsave.
import { api } from '@/api/client';
import { CandidateMeSchema } from '@/api/schemas/candidate';
import {
  GovJobListSchema,
  IntlJobListSchema,
  JobListSchema,
  JobSchema,
  SavedJobListSchema,
  SavedJobSchema,
  SuccessSchema,
} from '@/api/schemas/jobs';

/** The website asks for 4 similar jobs and filters the job itself out again (routes/jobs.$jobId.tsx). */
const SIMILAR_LIMIT = 4;

export const jobsApi = {
  /** Up to 50 active jobs, newest first. With a candidate token each job has `matchPercent`. No paging. */
  list: () => api.get('/api/jobs', JobListSchema),

  get: (id: string) => api.get(`/api/jobs/${encodeURIComponent(id)}`, JobSchema),

  similar: async (category: string, excludeId: string) => {
    const jobs = await api.get('/api/jobs', JobListSchema, {
      query: { category, excludeId, limit: SIMILAR_LIMIT },
    });
    return jobs.filter((j) => j.id !== excludeId).slice(0, SIMILAR_LIMIT);
  },

  savedList: () => api.get('/api/saved-jobs', SavedJobListSchema),

  save: (jobId: string) => api.post('/api/saved-jobs', { jobId }, SavedJobSchema),

  unsave: async (jobId: string) => {
    await api.delete(`/api/saved-jobs/${encodeURIComponent(jobId)}`, SuccessSchema);
  },

  govList: () => api.get('/api/gov-jobs', GovJobListSchema),

  intlList: () => api.get('/api/intl-jobs', IntlJobListSchema),

  /** Only to score jobs against the profile (website: hydrateProfileFromApi). Never written from this phase. */
  me: () => api.get('/api/candidates/me', CandidateMeSchema),
};
