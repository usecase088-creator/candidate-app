// Who may apply how, and the upload-CV form checks (website: routes/apply.$jobId.*.tsx, lib/validations.ts).
import { z } from 'zod';

import type { Application } from '@/api/schemas/applications';
import type { CandidateMe } from '@/api/schemas/candidate';
import { phoneSchema } from '@/features/auth/validation';

/** Website rule: a "form CV" exists when the saved profile is at least this complete. */
export const FORM_CV_MIN_COMPLETENESS = 30;

export function hasFormCv(me: CandidateMe | null | undefined): boolean {
  return !!me?.profile && (me.profile.completeness ?? 0) >= FORM_CV_MIN_COMPLETENESS;
}

export function alreadyApplied(applications: Application[] | undefined, jobId: string): boolean {
  return !!applications?.some((a) => a.jobId === jobId);
}

/** uploadApplySchema: the email is checked as typed and never changed; the phone is checked trimmed. */
const uploadApplySchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.email('Enter a valid email'),
  phone: phoneSchema,
});

export type UploadApplyField = 'name' | 'email' | 'phone';

/** The first problem in field order (name, email, phone), or undefined. */
export function uploadApplyError(values: {
  name: string;
  email: string;
  phone: string;
}): { field: UploadApplyField; message: string } | undefined {
  const parsed = uploadApplySchema.safeParse({ ...values, phone: values.phone.trim() });
  if (parsed.success) return undefined;
  const issue = parsed.error.issues[0];
  if (!issue) return undefined;
  return { field: issue.path[0] as UploadApplyField, message: issue.message };
}
