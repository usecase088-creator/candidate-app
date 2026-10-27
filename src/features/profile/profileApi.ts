// PUT /api/candidates/me (API.md §9): the server stores the profile JSON and answers with the whole candidate.
// The body carries the profile only; files and the CV have their own calls.
import { api } from '@/api/client';
import { CandidateMeSchema } from '@/api/schemas/candidate';

export const profileApi = {
  save: (profile: Record<string, unknown>) => api.put('/api/candidates/me', { profile }, CandidateMeSchema),
};
