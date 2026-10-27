// The upload transport that uses XMLHttpRequest, the only way in React Native to get upload progress (fetch has none).
// No React Native imports: XMLHttpRequest is a global in React Native, so this file is plain TypeScript and the
// tests give it a fake. It is handed to the API client in src/api/client.ts; the client does the headers, status and
// JSON handling (docs/DECISIONS.md D26).
import type { UploadRequest, UploadResponse } from './createApiClient';
import { ApiError } from './errors';

function abortError(): Error {
  const e = new Error('Aborted');
  e.name = 'AbortError';
  return e;
}

export function xhrUploadTransport(req: UploadRequest): Promise<UploadResponse> {
  return new Promise<UploadResponse>((resolve, reject) => {
    const Xhr = (globalThis as { XMLHttpRequest?: typeof XMLHttpRequest }).XMLHttpRequest;
    if (!Xhr) {
      reject(ApiError.network());
      return;
    }
    if (req.signal?.aborted) {
      reject(abortError());
      return;
    }

    const xhr = new Xhr();
    const onAbortSignal = () => xhr.abort();
    const done = () => req.signal?.removeEventListener('abort', onAbortSignal);

    xhr.open('POST', req.url);
    for (const [name, value] of Object.entries(req.headers)) xhr.setRequestHeader(name, value);
    xhr.timeout = req.timeoutMs;

    xhr.upload.onprogress = (e: ProgressEvent) => {
      if (e.lengthComputable && e.total > 0) req.onProgress?.(e.loaded, e.total);
    };
    xhr.onload = () => {
      done();
      resolve({ status: xhr.status, text: xhr.responseText });
    };
    xhr.onerror = () => {
      done();
      reject(ApiError.network());
    };
    xhr.ontimeout = () => {
      done();
      reject(ApiError.timeout());
    };
    xhr.onabort = () => {
      done();
      reject(abortError());
    };

    req.signal?.addEventListener('abort', onAbortSignal);
    xhr.send(req.body);
  });
}
