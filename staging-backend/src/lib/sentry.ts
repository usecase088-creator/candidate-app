import * as Sentry from '@sentry/node';

let enabled = false;

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
  });
  enabled = true;
}

export function captureException(error: unknown): void {
  if (!enabled) return;
  Sentry.captureException(error);
}

export function isSentryEnabled(): boolean {
  return enabled;
}
