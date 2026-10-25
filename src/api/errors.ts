// Every failure from src/api/client.ts is an ApiError. Screens pick their own wording from `kind`, `status` and
// `serverMessage` (e.g. login maps 401 like the website's loginErrorMessage); `message` is a safe default.

export type ApiErrorKind = 'network' | 'timeout' | 'http' | 'parse';

/** Website wording (docs/reference/SCREENS.md), except `timeout`, which the website has no state for. */
export const ERROR_MESSAGES = {
  network: 'Network error. Please check your connection and try again.',
  timeout: 'The server is taking too long to respond. Please try again.',
  server: 'Server error. Please try again in a moment.',
  generic: 'Something went wrong. Please try again.',
} as const;

type ApiErrorInit = {
  kind: ApiErrorKind;
  message: string;
  status?: number;
  serverMessage?: string;
  path?: string;
  issues?: string[];
};

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  /** The backend's `{ error }` text, when it sent one. */
  readonly serverMessage?: string;
  /** Request path (no query, no body). Set on parse errors for Sentry. */
  readonly path?: string;
  /** Zod issue paths and messages for parse errors. Never contains response values. */
  readonly issues?: string[];

  constructor(init: ApiErrorInit) {
    super(init.message);
    this.name = 'ApiError';
    this.kind = init.kind;
    this.status = init.status;
    this.serverMessage = init.serverMessage;
    this.path = init.path;
    this.issues = init.issues;
  }

  get isUnauthorized(): boolean {
    return this.kind === 'http' && this.status === 401;
  }

  get isRateLimited(): boolean {
    return this.kind === 'http' && this.status === 429;
  }

  static fromHttp(status: number, body: unknown): ApiError {
    const raw =
      typeof body === 'object' && body !== null && 'error' in body
        ? (body as { error: unknown }).error
        : undefined;
    const serverMessage = typeof raw === 'string' && raw.trim() ? raw : undefined;
    const message = status >= 500 ? ERROR_MESSAGES.server : (serverMessage ?? ERROR_MESSAGES.generic);
    return new ApiError({ kind: 'http', status, serverMessage, message });
  }

  static network(): ApiError {
    return new ApiError({ kind: 'network', message: ERROR_MESSAGES.network });
  }

  static timeout(): ApiError {
    return new ApiError({ kind: 'timeout', message: ERROR_MESSAGES.timeout });
  }

  static parse(status: number, path: string, issues: string[]): ApiError {
    return new ApiError({ kind: 'parse', status, path, issues, message: ERROR_MESSAGES.generic });
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}
