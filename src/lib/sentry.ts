// Crash and error reporting. Off without a DSN and always off in Jest. Everything passes through the scrubber.
import * as Sentry from '@sentry/react-native';

import type { ApiError } from '@/api/errors';

import type { Env } from './env';
import { scrubBreadcrumb, scrubEvent } from './sentryScrub';

let started = false;
let startedEnvironment: string | undefined;

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
  startedEnvironment = env.sentryEnvironment;
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

export const INSTALL_CHECK_KEY = 'sentry.installCheckSent';

/**
 * Preview builds only, once per install: sends one info event so we can see in Sentry that a real phone reaches it and that
 * the scrubber is on. The message carries a made-up email and phone number on purpose: in Sentry they must read [email]
 * and [phone]. Never in development or production builds, never twice, and it can never break the app.
 */
export async function sendInstallCheckEvent(storage: {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}): Promise<boolean> {
  if (!started || startedEnvironment !== 'preview') return false;
  try {
    if (await storage.getItem(INSTALL_CHECK_KEY)) return false;
    Sentry.captureMessage(
      'Install check: this preview build can reach Sentry. Scrub probe (made-up values): probe.person@example.test 9876543210',
      { level: 'info', tags: { purpose: 'install-check' } },
    );
    await storage.setItem(INSTALL_CHECK_KEY, '1');
    return true;
  } catch {
    return false;
  }
}
