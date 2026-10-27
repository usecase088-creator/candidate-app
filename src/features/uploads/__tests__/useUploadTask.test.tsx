import { act, waitFor } from '@testing-library/react-native';

import { ApiError } from '@/api/errors';
import { renderHookWithProviders } from '@/test/renderHookWithProviders';

import { uploadErrorText, useUploadTask } from '../hooks/useUploadTask';

describe('uploadErrorText', () => {
  it('keeps the server message for a client-side refusal (4xx)', () => {
    expect(uploadErrorText(ApiError.fromHttp(400, { error: 'Invalid file type.' }), 'Failed to upload')).toBe(
      'Invalid file type.',
    );
  });

  it('uses the connection message for network and timeout errors', () => {
    expect(uploadErrorText(ApiError.network(), 'x')).toBe(ApiError.network().message);
    expect(uploadErrorText(ApiError.timeout(), 'x')).toBe(ApiError.timeout().message);
  });

  it('a server error (5xx) is the fallback, never the raw server text', () => {
    expect(
      uploadErrorText(
        ApiError.fromHttp(500, { error: 'ECONNRESET at line 4' }),
        'Failed to upload documents',
      ),
    ).toBe('Failed to upload documents');
  });

  it('a plain Error (a file the app refused) keeps its words', () => {
    expect(uploadErrorText(new Error('File must be under 5MB'), 'x')).toBe('File must be under 5MB');
  });

  it('anything else is the fallback', () => {
    expect(uploadErrorText('weird', 'Failed to upload CV file')).toBe('Failed to upload CV file');
  });
});

describe('useUploadTask', () => {
  it('starts idle, shows uploading with progress, and returns to idle with the result', async () => {
    const { result } = await renderHookWithProviders(() => useUploadTask('Failed to upload'));
    expect(result.current.status).toEqual({ state: 'idle', progress: 0 });

    let release!: (v: string) => void;
    const gate = new Promise<string>((r) => (release = r));
    let promise!: Promise<unknown>;
    await act(async () => {
      promise = result.current.run(async (o) => {
        o.onProgress?.(25, 100);
        return gate;
      });
    });
    expect(result.current.status).toEqual({ state: 'uploading', progress: 0.25 });

    await act(async () => {
      release('done');
      await promise;
    });
    await expect(promise).resolves.toEqual({ ok: true, value: 'done' });
    expect(result.current.status).toEqual({ state: 'idle', progress: 0 });
  });

  it('a failure shows the message and keeps the last progress, so Retry can run again', async () => {
    const { result } = await renderHookWithProviders(() => useUploadTask('Failed to upload documents'));
    let out: unknown;
    await act(async () => {
      out = await result.current.run(async (o) => {
        o.onProgress?.(40, 100);
        throw ApiError.network();
      });
    });
    expect(out).toEqual({ ok: false, cancelled: false, error: expect.any(ApiError) });
    expect(result.current.status).toEqual({
      state: 'error',
      progress: 0.4,
      message: ApiError.network().message,
    });
  });

  it('cancel aborts the signal, goes back to idle and is reported as cancelled, not as an error', async () => {
    const { result } = await renderHookWithProviders(() => useUploadTask('x'));
    let seenSignal: AbortSignal | undefined;
    let promise!: Promise<unknown>;
    await act(async () => {
      promise = result.current.run(
        (o) =>
          new Promise((_resolve, reject) => {
            seenSignal = o.signal;
            o.signal?.addEventListener('abort', () => {
              const e = new Error('Aborted');
              e.name = 'AbortError';
              reject(e);
            });
          }),
      );
    });
    await act(async () => {
      result.current.cancel();
      await promise;
    });
    expect(seenSignal?.aborted).toBe(true);
    await expect(promise).resolves.toEqual({ ok: false, cancelled: true });
    expect(result.current.status).toEqual({ state: 'idle', progress: 0 });
  });

  it('only whole-percent changes re-render (a fast progress stream is not a render storm)', async () => {
    let renders = 0;
    const { result } = await renderHookWithProviders(() => {
      renders += 1;
      return useUploadTask('x');
    });
    const before = renders;
    await act(async () => {
      await result.current.run(async (o) => {
        for (let sent = 0; sent <= 1000; sent += 1) o.onProgress?.(sent, 1000);
        return 'ok';
      });
    });
    expect(renders - before).toBeLessThan(150);
  });

  it('a second run while one is going is refused (no double uploads)', async () => {
    const { result } = await renderHookWithProviders(() => useUploadTask('x'));
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    let first!: Promise<unknown>;
    await act(async () => {
      first = result.current.run(async () => gate);
    });
    let second: unknown;
    await act(async () => {
      second = await result.current.run(async () => 'second');
    });
    expect(second).toEqual({ ok: false, cancelled: true });
    await act(async () => {
      release();
      await first;
    });
  });

  it('leaving the screen cancels a running upload', async () => {
    const { result, unmount } = await renderHookWithProviders(() => useUploadTask('x'));
    let signal: AbortSignal | undefined;
    await act(async () => {
      void result.current.run(
        (o) =>
          new Promise(() => {
            signal = o.signal;
          }),
      );
    });
    await unmount();
    await waitFor(() => expect(signal?.aborted).toBe(true));
  });
});
