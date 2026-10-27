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
