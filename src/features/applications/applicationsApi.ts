// Application endpoints the candidate website calls (docs/reference/API.md §17-19). Uploads: src/features/uploads.
import { api } from '@/api/client';
import {
  ApplicationListSchema,
  ApplicationSchema,
  type CustomFieldResponses,
  type UploadedFile,
} from '@/api/schemas/applications';
import type { CandidateMe } from '@/api/schemas/candidate';

import { buildQuickApplyProfile } from './logic/quickApplyProfile';

export { buildQuickApplyProfile };

export type ApplyContact = { name: string; email: string; phone: string };

const withAnswers = (answers?: CustomFieldResponses) =>
  answers && Object.keys(answers).length > 0 ? { customFieldResponses: answers } : {};

export const applicationsApi = {
  /** All of the candidate's applications, newest first, at most 50 (no paging, like the website). */
  list: () => api.get('/api/applications', ApplicationListSchema),

  /** Apply with the saved form profile ("Quick Apply"). */
  quickApply: (jobId: string, me: CandidateMe, answers?: CustomFieldResponses) =>
    api.post(
      '/api/applications',
      { jobId, cvSource: 'form', profile: buildQuickApplyProfile(me), ...withAnswers(answers) },
      ApplicationSchema,
    ),

  /**
   * Apply with an uploaded CV (already sent with `uploadCv`). The email goes exactly as typed. The server also stores
   * the contact data on the candidate, like the website (API.md §18).
   */
  applyWithCv: (
    jobId: string,
    cv: UploadedFile,
    contact: ApplyContact,
    answers?: CustomFieldResponses,
    picked?: { name?: string; mime?: string },
  ) =>
    api.post(
      '/api/applications',
      {
        jobId,
        cvSource: 'upload',
        cvUrl: cv.url,
        cvCloudinaryId: cv.publicId,
        cvName: cv.name || picked?.name,
        cvMime: cv.mime || picked?.mime,
        uploadedCv: { contact },
        ...withAnswers(answers),
      },
      ApplicationSchema,
    ),

  /** Candidate answers: accept / decline / reschedule an interview, upload done, accept / reject an offer. */
  respond: (id: string, status: string, note?: string) =>
    api.patch(
      `/api/applications/${encodeURIComponent(id)}`,
      { status, ...(note?.trim() ? { candidateResponseNote: note.trim() } : {}) },
      ApplicationSchema,
    ),
};
