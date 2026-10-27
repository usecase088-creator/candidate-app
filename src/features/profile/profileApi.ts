// PUT /api/candidates/me (API.md §9): the server stores the profile JSON and answers with the whole candidate.
// `supportingDocuments` REPLACES the stored list when it is not empty, so callers always send the full list.
import { api } from '@/api/client';
import { CandidateMeSchema, type SupportingDocument } from '@/api/schemas/candidate';

export const profileApi = {
  save: (profile: Record<string, unknown>, supportingDocuments?: SupportingDocument[]) =>
    api.put(
      '/api/candidates/me',
      supportingDocuments && supportingDocuments.length > 0 ? { profile, supportingDocuments } : { profile },
      CandidateMeSchema,
    ),
};
