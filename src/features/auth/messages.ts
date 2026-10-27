// Website wording (../job/candidates/src/lib/authMessages.ts, SCREENS.md) plus D18.
import { ERROR_MESSAGES, isApiError } from '@/api/errors';

import type { SignOutReason } from './sessionStore';

export const ROLE_MISMATCH_MESSAGE =
  'This email is registered as a recruiter account. Please sign in on the Recruiter Portal instead.';

/** Forgot password uses a shorter network message than sign-in. */
export const FORGOT_NETWORK_ERROR = 'Network error. Please try again.';

/** D18: app wording; the website signs out silently. */
export const SESSION_EXPIRED_MESSAGE = 'Your session has expired. Please sign in again.';

/** After the user deleted their own account (Phase 4). */
export const ACCOUNT_DELETED_MESSAGE = 'Your account has been deleted.';

/** authMessages.ts:16 loginErrorMessage, used for sign-in, send OTP and register. */
export function loginErrorMessage(error: unknown): string {
  if (!isApiError(error)) return ERROR_MESSAGES.generic;
  if (error.kind === 'network' || error.kind === 'timeout') return ERROR_MESSAGES.network;
  if (error.kind !== 'http') return ERROR_MESSAGES.generic;
  const status = error.status ?? 0;
  const server = error.serverMessage;
  if (status === 401) return 'Invalid email or password. Please try again.';
  if (status === 400) return server ?? 'Please check your email and password.';
  if (status === 409) return server ?? 'This email is already registered.';
  if (status >= 500) return ERROR_MESSAGES.server;
  return server ?? ERROR_MESSAGES.generic;
}

/** D18: what the login screen says about the last sign-out. */
export function signOutNotice(reason: SignOutReason | undefined, message?: string): string | undefined {
  if (reason === 'expired') return SESSION_EXPIRED_MESSAGE;
  if (reason === 'blocked') return message ?? SESSION_EXPIRED_MESSAGE;
  if (reason === 'deleted') return ACCOUNT_DELETED_MESSAGE;
  return undefined;
}
