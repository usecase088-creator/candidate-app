// Crash and error reporting. Off without a DSN and always off in Jest. Everything passes through the scrubber.
import * as Sentry from '@sentry/react-native';

import type { ApiError } from '@/api/errors';

import type { Env } from './env';
import { scrubBreadcrumb, scrubEvent } from './sentryScrub';

let started = false;

export function initSentry(
  env: { sentryDsn?: Env['sentryDsn']; sentryEnvironment: Env['sentryEnvironment'] },
  { isTest = process.env.NODE_ENV === 'test' }: { isTest?: boolean } = {},
): boolean {
  if (!env.sentryDsn || isTest) return false;
  Sentry.init({
    dsn: env.sentryDsn,
    environment: env.sentryEnvironment,
    sendDefaultPii: false,
    attachScreenshot: false,
    attachViewHierarchy: false,
    beforeSend: (event) => scrubEvent(event),
    beforeBreadcrumb: (crumb) => scrubBreadcrumb(crumb),
  });
  started = true;
  return true;
}

/** For src/api/client.ts parse errors: the backend's response shape no longer matches our schema. */
export function reportApiError(error: ApiError): void {
  if (!started) return;
  Sentry.captureException(error, {
    tags: { api_error_kind: error.kind },
    extra: { status: error.status, path: error.path, issues: error.issues },
  });
}
