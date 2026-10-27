// The API client factory: no React Native or Expo imports, so Node tools (contract tests, drift check) can use it.
// The app's instance is in src/api/client.ts. Every response is parsed with a Zod schema; every failure is an ApiError.
import type { z } from 'zod';

import { ApiError } from './errors';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type Query = Record<string, string | number | boolean | null | undefined>;
export type RequestOptions = { query?: Query; signal?: AbortSignal };

/** One multipart upload, ready to send. The transport adds the multipart Content-Type (with its boundary) itself. */
export type UploadRequest = {
  url: string;
  headers: Record<string, string>;
  body: FormData;
  timeoutMs: number;
  signal?: AbortSignal;
  /** Bytes sent and total bytes, only when the total is known. */
  onProgress?: (sent: number, total: number) => void;
};
export type UploadResponse = { status: number; text: string };
/** Sends the request and resolves with whatever the server answered (any status). Rejects with an ApiError for a
 *  network failure or a timeout, and with an AbortError when cancelled. */
export type UploadTransport = (req: UploadRequest) => Promise<UploadResponse>;
export type UploadOptions = { signal?: AbortSignal; onProgress?: (sent: number, total: number) => void };

export type ApiClientConfig = {
  baseUrl: string | (() => string);
  appVersion: string;
  platform: string;
  timeoutMs?: number;
  /** Uploads of files take longer than normal calls. Default 60 s. */
  uploadTimeoutMs?: number;
  /** How multipart uploads are sent. The app passes the XMLHttpRequest one (progress); Node tools pass none. */
  uploadTransport?: UploadTransport;
  /** Called once when a signed-in request gets 401; armed again by the next setAuthToken(token). */
  onSessionExpired?: () => void;
  /** Receives parse errors (backend shape changed) for Sentry. */
  reportError?: (error: ApiError) => void;
};

const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_UPLOAD_TIMEOUT_MS = 60_000;

function zodIssues(error: z.ZodError): string[] {
  // Paths and messages only: Zod messages name the expected/received types, never the values.
  return error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`);
}

export function createApiClient(config: ApiClientConfig) {
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const uploadTimeoutMs = config.uploadTimeoutMs ?? DEFAULT_UPLOAD_TIMEOUT_MS;
  let token: string | null = null;
  let expiryReported = false;
  let onSessionExpired = config.onSessionExpired;
  let reportError = config.reportError;

  const baseUrl = () => (typeof config.baseUrl === 'function' ? config.baseUrl() : config.baseUrl);

  function buildUrl(path: string, query?: Query): string {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query ?? {})) {
      if (v !== undefined && v !== null) params.append(k, String(v));
    }
    const qs = params.toString();
    return `${baseUrl()}${path}${qs ? `?${qs}` : ''}`;
  }

  function fail(error: ApiError): never {
    if (error.kind === 'parse') reportError?.(error);
    throw error;
  }

  async function once<S extends z.ZodType>(
    method: Method,
    path: string,
    schema: S,
    body: unknown,
    opts: RequestOptions,
  ): Promise<z.output<S>> {
    const sentToken = token;
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'X-App-Version': config.appVersion,
      'X-Platform': config.platform,
    };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (sentToken) headers.Authorization = `Bearer ${sentToken}`;

    // Our own controller so a timeout and a caller's abort can be told apart.
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    const abortFromCaller = () => controller.abort();
    if (opts.signal?.aborted) controller.abort();
    opts.signal?.addEventListener('abort', abortFromCaller);

    let status: number;
    let ok: boolean;
    let text: string;
    try {
      const res = await fetch(buildUrl(path, opts.query), {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
      status = res.status;
      ok = res.ok;
      text = await res.text();
    } catch (e) {
      if (timedOut) throw ApiError.timeout();
      if (opts.signal?.aborted) throw e;
      throw ApiError.network();
    } finally {
      clearTimeout(timer);
      opts.signal?.removeEventListener('abort', abortFromCaller);
    }

    return handleResponse(status, ok, text, path, schema, sentToken);
  }

  /** Same for every call: error statuses become ApiErrors, a 401 ends the session once, the body is parsed. */
  function handleResponse<S extends z.ZodType>(
    status: number,
    ok: boolean,
    text: string,
    path: string,
    schema: S,
    sentToken: string | null,
  ): z.output<S> {
    let json: unknown;
    let isJson = true;
    try {
      json = text === '' ? undefined : JSON.parse(text);
    } catch {
      isJson = false;
    }

    if (!ok) {
      if (status === 401 && sentToken && sentToken === token && !expiryReported) {
        expiryReported = true;
        onSessionExpired?.();
      }
      throw ApiError.fromHttp(status, isJson ? json : undefined);
    }
    if (!isJson) fail(ApiError.parse(status, path, ['(root): response is not JSON']));
    const parsed = schema.safeParse(json);
    if (!parsed.success) fail(ApiError.parse(status, path, zodIssues(parsed.error)));
    return parsed.data;
  }

  /** One multipart upload. Never repeated by itself (a retry could store the file twice). */
  async function upload<S extends z.ZodType>(
    path: string,
    body: FormData,
    schema: S,
    opts: UploadOptions = {},
  ): Promise<z.output<S>> {
    if (!config.uploadTransport) throw new Error('This API client has no upload transport.');
    const sentToken = token;
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'X-App-Version': config.appVersion,
      'X-Platform': config.platform,
    };
    if (sentToken) headers.Authorization = `Bearer ${sentToken}`;

    let res: UploadResponse;
    try {
      res = await config.uploadTransport({
        url: buildUrl(path),
        headers,
        body,
        timeoutMs: uploadTimeoutMs,
        signal: opts.signal,
        onProgress: opts.onProgress,
      });
    } catch (e) {
      if (e instanceof ApiError) throw e;
      if (e instanceof Error && e.name === 'AbortError') throw e;
      throw ApiError.network();
    }
    return handleResponse(
      res.status,
      res.status >= 200 && res.status < 300,
      res.text,
      path,
      schema,
      sentToken,
    );
  }

  async function request<S extends z.ZodType>(
    method: Method,
    path: string,
    schema: S,
    body?: unknown,
    opts: RequestOptions = {},
  ): Promise<z.output<S>> {
    // GET is safe to repeat: one retry on a network error. Never for writes (PLAN.md §2).
    const attempts = method === 'GET' ? 2 : 1;
    for (let attempt = 1; ; attempt++) {
      try {
        return await once(method, path, schema, body, opts);
      } catch (e) {
        if (e instanceof ApiError && e.kind === 'network' && attempt < attempts) continue;
        throw e;
      }
    }
  }

  return {
    timeoutMs,
    upload,
    setAuthToken(next: string | null) {
      token = next;
      expiryReported = false;
    },
    setSessionExpiredHandler(handler: (() => void) | undefined) {
      onSessionExpired = handler;
    },
    /** Wired to Sentry at app start (root layout), so the client itself has no Sentry dependency. */
    setErrorReporter(reporter: ((error: ApiError) => void) | undefined) {
      reportError = reporter;
    },
    get: <S extends z.ZodType>(path: string, schema: S, opts?: RequestOptions) =>
      request('GET', path, schema, undefined, opts),
    post: <S extends z.ZodType>(path: string, body: unknown, schema: S, opts?: RequestOptions) =>
      request('POST', path, schema, body, opts),
    put: <S extends z.ZodType>(path: string, body: unknown, schema: S, opts?: RequestOptions) =>
      request('PUT', path, schema, body, opts),
    patch: <S extends z.ZodType>(path: string, body: unknown, schema: S, opts?: RequestOptions) =>
      request('PATCH', path, schema, body, opts),
    delete: <S extends z.ZodType>(path: string, schema: S, opts?: RequestOptions) =>
      request('DELETE', path, schema, undefined, opts),
    /** DELETE that names what to delete in a JSON body (push token). */
    deleteJson: <S extends z.ZodType>(path: string, body: unknown, schema: S, opts?: RequestOptions) =>
      request('DELETE', path, schema, body, opts),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
