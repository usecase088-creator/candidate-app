// Words for failed application actions. The website always shows its own sentence whatever the server said; the
// app keeps those sentences as the headline and adds the server's reason when it is a refusal (4xx) a person can
// act on. Server errors (5xx) never show raw server text.
import { isApiError } from '@/api/errors';

/** Connection problems say so; a refusal gives its reason after the headline; anything else is the headline. */
export function failureText(
  error: unknown,
  headline: string,
  options: { reasonOnly?: boolean } = {},
): string {
  if (isApiError(error)) {
    if (error.kind === 'network' || error.kind === 'timeout') return error.message;
    if (error.kind === 'http' && error.serverMessage && (error.status ?? 0) < 500) {
      return options.reasonOnly ? error.serverMessage : `${headline}: ${error.serverMessage}`;
    }
  }
  return headline;
}

export const isConflict = (error: unknown) =>
  isApiError(error) && error.kind === 'http' && error.status === 409;

/** Website sentences for an application the server refused (lib/applications.ts postApplication), or undefined. */
export function applyRefusalText(error: unknown): string | undefined {
  if (!isApiError(error) || error.kind !== 'http') return undefined;
  if (error.status === 409 && !error.serverMessage) return 'You have already applied to this job';
  if (error.status === 413) {
    return 'CV file is too large for upload. Try a smaller PDF (under 4MB) or use the form application.';
  }
  const reason = (error.serverMessage ?? '').toLowerCase();
  if (reason.includes('entity too large') || reason.includes('payload')) {
    return 'CV upload failed — file may be too large. Try a PDF under 4MB or use the form instead.';
  }
  return undefined;
}
