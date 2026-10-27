// One upload at a time with progress, cancel and a result the screen can act on (Phase 3 task 3). The screen keeps its
// files, so after a failure "Try again" simply runs the task again; a cancel is not an error. Leaving the screen cancels.
import { useCallback, useEffect, useRef, useState } from 'react';

import type { UploadOptions } from '@/api/client';
import { isApiError } from '@/api/errors';

import type { UploadStatus } from '../components/FilePickerField';

export type UploadRun<T> =
  { ok: true; value: T } | { ok: false; cancelled: true } | { ok: false; cancelled: false; error: unknown };

/** Words for a failed upload: a server refusal keeps its text, a connection problem says so, else the fallback. */
export function uploadErrorText(error: unknown, fallback: string): string {
  if (isApiError(error)) {
    if (error.serverMessage && (error.status ?? 0) < 500) return error.serverMessage;
    if (error.kind === 'network' || error.kind === 'timeout') return error.message;
    return fallback;
  }
  if (error instanceof Error && error.name !== 'AbortError' && error.message) return error.message;
  return fallback;
}

const isAbort = (e: unknown) => e instanceof Error && e.name === 'AbortError';
const IDLE: UploadStatus = { state: 'idle', progress: 0 };

export function useUploadTask(fallbackError: string) {
  const [status, setStatus] = useState<UploadStatus>(IDLE);
  const controller = useRef<AbortController | null>(null);
  const percent = useRef(-1);
  const progress = useRef(0);

  useEffect(
    () => () => {
      controller.current?.abort();
    },
    [],
  );

  const run = useCallback(
    async <T>(task: (options: UploadOptions) => Promise<T>): Promise<UploadRun<T>> => {
      if (controller.current) return { ok: false, cancelled: true };
      const own = new AbortController();
      controller.current = own;
      percent.current = -1;
      progress.current = 0;
      setStatus({ state: 'uploading', progress: 0 });
      try {
        const value = await task({
          signal: own.signal,
          onProgress: (sent, total) => {
            const fraction = total > 0 ? Math.min(1, sent / total) : 0;
            progress.current = fraction;
            const whole = Math.round(fraction * 100);
            if (whole === percent.current) return;
            percent.current = whole;
            setStatus({ state: 'uploading', progress: fraction });
          },
        });
        setStatus(IDLE);
        return { ok: true, value };
      } catch (error) {
        if (isAbort(error) || own.signal.aborted) {
          setStatus(IDLE);
          return { ok: false, cancelled: true };
        }
        setStatus({
          state: 'error',
          progress: progress.current,
          message: uploadErrorText(error, fallbackError),
        });
        return { ok: false, cancelled: false, error };
      } finally {
        controller.current = null;
      }
    },
    [fallbackError],
  );

  const cancel = useCallback(() => controller.current?.abort(), []);
  const reset = useCallback(() => setStatus(IDLE), []);

  return { status, run, cancel, reset };
}
