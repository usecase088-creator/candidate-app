// The real upload transport, against a fake XMLHttpRequest that behaves like React Native's (Jest has none).
import { ApiError } from '../errors';
import { xhrUploadTransport } from '../xhrUploadTransport';

type Listener = (event?: unknown) => void;

class FakeXhr {
  static last: FakeXhr | undefined;
  method = '';
  url = '';
  headers: Record<string, string> = {};
  body: unknown;
  timeout = 0;
  status = 0;
  responseText = '';
  aborted = false;
  upload: { onprogress: ((e: { lengthComputable: boolean; loaded: number; total: number }) => void) | null } =
    {
      onprogress: null,
    };
  onload: Listener | null = null;
  onerror: Listener | null = null;
  ontimeout: Listener | null = null;
  onabort: Listener | null = null;

  constructor() {
    FakeXhr.last = this;
  }
  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }
  setRequestHeader(name: string, value: string) {
    this.headers[name] = value;
  }
  send(body: unknown) {
    this.body = body;
  }
  abort() {
    this.aborted = true;
    this.onabort?.();
  }
  // helpers used by the tests
  progress(loaded: number, total: number, lengthComputable = true) {
    this.upload.onprogress?.({ lengthComputable, loaded, total });
  }
  reply(status: number, text: string) {
    this.status = status;
    this.responseText = text;
    this.onload?.();
  }
}

const original = (globalThis as { XMLHttpRequest?: unknown }).XMLHttpRequest;
beforeEach(() => {
  FakeXhr.last = undefined;
  (globalThis as { XMLHttpRequest?: unknown }).XMLHttpRequest = FakeXhr;
});
afterEach(() => {
  (globalThis as { XMLHttpRequest?: unknown }).XMLHttpRequest = original;
});

const base = {
  url: 'http://api.test/api/upload/cv',
  headers: { Authorization: 'Bearer t' },
  body: new FormData(),
  timeoutMs: 60_000,
};

describe('xhrUploadTransport', () => {
  it('POSTs the form with the given headers and timeout, and resolves with status and text', async () => {
    const promise = xhrUploadTransport(base);
    const x = FakeXhr.last!;
    expect(x.method).toBe('POST');
    expect(x.url).toBe(base.url);
    expect(x.headers).toEqual({ Authorization: 'Bearer t' });
    expect(x.body).toBe(base.body);
    expect(x.timeout).toBe(60_000);
    x.reply(200, '{"url":"u"}');
    await expect(promise).resolves.toEqual({ status: 200, text: '{"url":"u"}' });
  });

  it('an HTTP error status still resolves (the client turns it into an ApiError)', async () => {
    const promise = xhrUploadTransport(base);
    FakeXhr.last!.reply(500, '{"error":"Internal Server Error"}');
    await expect(promise).resolves.toEqual({ status: 500, text: '{"error":"Internal Server Error"}' });
  });

  it('reports progress as sent bytes and total bytes', async () => {
    const onProgress = jest.fn();
    const promise = xhrUploadTransport({ ...base, onProgress });
    FakeXhr.last!.progress(1000, 4000);
    FakeXhr.last!.progress(4000, 4000);
    FakeXhr.last!.reply(200, '{}');
    await promise;
    expect(onProgress.mock.calls).toEqual([
      [1000, 4000],
      [4000, 4000],
    ]);
  });

  it('ignores progress events without a known total', async () => {
    const onProgress = jest.fn();
    const promise = xhrUploadTransport({ ...base, onProgress });
    FakeXhr.last!.progress(10, 0, false);
    FakeXhr.last!.reply(200, '{}');
    await promise;
    expect(onProgress).not.toHaveBeenCalled();
  });

  it('a network error rejects with a network ApiError', async () => {
    const promise = xhrUploadTransport(base);
    FakeXhr.last!.onerror?.();
    await expect(promise).rejects.toMatchObject({ kind: 'network' });
    await expect(promise).rejects.toBeInstanceOf(ApiError);
  });

  it('a timeout rejects with a timeout ApiError', async () => {
    const promise = xhrUploadTransport(base);
    FakeXhr.last!.ontimeout?.();
    await expect(promise).rejects.toMatchObject({ kind: 'timeout' });
  });

  it('aborting the signal cancels the request and rejects with an AbortError', async () => {
    const controller = new AbortController();
    const promise = xhrUploadTransport({ ...base, signal: controller.signal });
    controller.abort();
    expect(FakeXhr.last!.aborted).toBe(true);
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('a signal that is already aborted never sends anything', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(xhrUploadTransport({ ...base, signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(FakeXhr.last).toBeUndefined();
  });

  it('stops listening to the signal once the request has finished', async () => {
    const controller = new AbortController();
    const promise = xhrUploadTransport({ ...base, signal: controller.signal });
    const x = FakeXhr.last!;
    x.reply(200, '{}');
    await promise;
    controller.abort();
    expect(x.aborted).toBe(false);
  });

  it('fails with a network error when the runtime has no XMLHttpRequest', async () => {
    (globalThis as { XMLHttpRequest?: unknown }).XMLHttpRequest = undefined;
    await expect(xhrUploadTransport(base)).rejects.toMatchObject({ kind: 'network' });
  });
});
