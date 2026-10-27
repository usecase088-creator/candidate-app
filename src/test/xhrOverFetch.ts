// Test helper: Jest has no XMLHttpRequest (React Native's is native), so MSW cannot see uploads. This installs a small
// XMLHttpRequest that sends through Node's fetch, which MSW does intercept. The real xhrUploadTransport and the real API
// client run on top of it. It reports progress once before sending and once when done, and supports abort and timeout.

type Listener = (() => void) | null;

export class FetchBackedXhr {
  method = '';
  url = '';
  timeout = 0;
  status = 0;
  responseText = '';
  upload: { onprogress: ((e: { lengthComputable: boolean; loaded: number; total: number }) => void) | null } =
    {
      onprogress: null,
    };
  onload: Listener = null;
  onerror: Listener = null;
  ontimeout: Listener = null;
  onabort: Listener = null;
  private headers: Record<string, string> = {};
  private controller = new AbortController();
  private finished = false;

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  setRequestHeader(name: string, value: string) {
    this.headers[name] = value;
  }

  abort() {
    if (this.finished) return;
    this.finished = true;
    this.controller.abort();
    this.onabort?.();
  }

  send(body: FormData) {
    this.upload.onprogress?.({ lengthComputable: true, loaded: 1, total: 4 });
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (this.timeout > 0) {
      timer = setTimeout(() => {
        if (this.finished) return;
        this.finished = true;
        this.controller.abort();
        this.ontimeout?.();
      }, this.timeout);
    }
    fetch(this.url, { method: this.method, headers: this.headers, body, signal: this.controller.signal })
      .then(async (res) => {
        const text = await res.text();
        if (this.finished) return;
        this.finished = true;
        this.status = res.status;
        this.responseText = text;
        this.upload.onprogress?.({ lengthComputable: true, loaded: 4, total: 4 });
        this.onload?.();
      })
      .catch(() => {
        if (this.finished) return;
        this.finished = true;
        this.onerror?.();
      })
      .finally(() => {
        if (timer) clearTimeout(timer);
      });
  }
}

/** Call in beforeAll/beforeEach. Returns a function that puts the previous global back. */
export function installXhrOverFetch(): () => void {
  const g = globalThis as { XMLHttpRequest?: unknown };
  const previous = g.XMLHttpRequest;
  g.XMLHttpRequest = FetchBackedXhr;
  return () => {
    g.XMLHttpRequest = previous;
  };
}
