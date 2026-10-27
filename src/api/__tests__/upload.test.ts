// Multipart uploads with progress, cancel and a swappable transport (Phase 3 task 3, D26).
// MSW cannot see React Native's XMLHttpRequest (Jest has none), so the client takes a transport function and the
// tests give it a fake one. The real XHR transport is tested in xhrUploadTransport.test.ts with a fake XMLHttpRequest.
import { z } from 'zod';

import {
  createApiClient,
  type UploadRequest,
  type UploadResponse,
  type UploadTransport,
} from '../createApiClient';
import { ApiError } from '../errors';

const UploadedSchema = z.object({ url: z.string(), publicId: z.string() }).loose();

function setup(
  reply: UploadResponse | ((req: UploadRequest) => Promise<UploadResponse>),
  config: Partial<Parameters<typeof createApiClient>[0]> = {},
) {
  const calls: UploadRequest[] = [];
  const transport: UploadTransport = async (req) => {
    calls.push(req);
    return typeof reply === 'function' ? reply(req) : reply;
  };
  const client = createApiClient({
    baseUrl: 'http://api.test',
    appVersion: '1.2.3',
    platform: 'android',
    uploadTransport: transport,
    ...config,
  });
  return { client, calls };
}

const json = (status: number, body: unknown): UploadResponse => ({ status, text: JSON.stringify(body) });
const form = () => {
  const f = new FormData();
  f.append('cv', 'x');
  return f;
};

describe('upload request', () => {
  it('POSTs the form to base URL + path with the token, app headers, and no Content-Type (the boundary is added by the transport)', async () => {
    const { client, calls } = setup(json(200, { url: 'https://x.test/cv.pdf', publicId: 'cv/1' }));
    client.setAuthToken('tok-1');
    const body = form();
    await expect(client.upload('/api/upload/cv', body, UploadedSchema)).resolves.toMatchObject({
      publicId: 'cv/1',
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe('http://api.test/api/upload/cv');
    expect(calls[0]?.body).toBe(body);
    expect(calls[0]?.headers).toMatchObject({
      Authorization: 'Bearer tok-1',
      Accept: 'application/json',
      'X-App-Version': '1.2.3',
      'X-Platform': 'android',
    });
    expect(Object.keys(calls[0]?.headers ?? {}).map((k) => k.toLowerCase())).not.toContain('content-type');
  });

  it('sends no Authorization header when signed out', async () => {
    const { client, calls } = setup(json(200, { url: 'u', publicId: 'p' }));
    await client.upload('/api/upload/cv', form(), UploadedSchema);
    expect(calls[0]?.headers).not.toHaveProperty('Authorization');
  });

  it('gives the transport the longer upload timeout (60 s by default, the client timeout for normal calls stays 20 s)', async () => {
    const { client, calls } = setup(json(200, { url: 'u', publicId: 'p' }));
    await client.upload('/x', form(), UploadedSchema);
    expect(calls[0]?.timeoutMs).toBe(60_000);
    expect(client.timeoutMs).toBe(20_000);
    const custom = setup(json(200, { url: 'u', publicId: 'p' }), { uploadTimeoutMs: 5_000 });
    await custom.client.upload('/x', form(), UploadedSchema);
    expect(custom.calls[0]?.timeoutMs).toBe(5_000);
  });

  it('passes the progress callback and the abort signal on', async () => {
    const { client, calls } = setup(json(200, { url: 'u', publicId: 'p' }));
    const onProgress = jest.fn();
    const controller = new AbortController();
    await client.upload('/x', form(), UploadedSchema, { onProgress, signal: controller.signal });
    calls[0]?.onProgress?.(50, 100);
    expect(onProgress).toHaveBeenCalledWith(50, 100);
    expect(calls[0]?.signal).toBe(controller.signal);
  });

  it('never repeats an upload by itself, even after a network error', async () => {
    let attempts = 0;
    const { client } = setup(async () => {
      attempts += 1;
      throw ApiError.network();
    });
    await expect(client.upload('/x', form(), UploadedSchema)).rejects.toMatchObject({ kind: 'network' });
    expect(attempts).toBe(1);
  });
});

describe('upload response', () => {
  it('a server error keeps the backend message (HTTP 400)', async () => {
    const { client } = setup(
      json(400, { error: 'Unsupported file format. Please upload a PDF, DOCX, JPG, or PNG.' }),
    );
    await expect(client.upload('/x', form(), UploadedSchema)).rejects.toMatchObject({
      kind: 'http',
      status: 400,
      serverMessage: 'Unsupported file format. Please upload a PDF, DOCX, JPG, or PNG.',
    });
  });

  it('the 500 the backend sends for an oversize file is the generic server error (the app checks size first)', async () => {
    const { client } = setup(json(500, { error: 'Internal Server Error' }));
    await expect(client.upload('/x', form(), UploadedSchema)).rejects.toMatchObject({ status: 500 });
  });

  it('413 from a proxy is an http error', async () => {
    const { client } = setup({ status: 413, text: '<html>Request Entity Too Large</html>' });
    await expect(client.upload('/x', form(), UploadedSchema)).rejects.toMatchObject({
      kind: 'http',
      status: 413,
    });
  });

  it('a reply that does not match the schema is a parse error and is reported', async () => {
    const reporter = jest.fn();
    const { client } = setup(json(200, { nope: true }), { reportError: reporter });
    await expect(client.upload('/api/upload/cv', form(), UploadedSchema)).rejects.toMatchObject({
      kind: 'parse',
    });
    expect(reporter).toHaveBeenCalledTimes(1);
  });

  it('a success body that is not JSON is a parse error', async () => {
    const { client } = setup({ status: 200, text: 'OK' });
    await expect(client.upload('/x', form(), UploadedSchema)).rejects.toMatchObject({ kind: 'parse' });
  });

  it('a 401 with a token ends the session once, like every other call', async () => {
    const expired = jest.fn();
    const { client } = setup(json(401, { error: 'Unauthorized' }), { onSessionExpired: expired });
    client.setAuthToken('tok');
    await expect(client.upload('/x', form(), UploadedSchema)).rejects.toMatchObject({ status: 401 });
    await expect(client.upload('/x', form(), UploadedSchema)).rejects.toMatchObject({ status: 401 });
    expect(expired).toHaveBeenCalledTimes(1);
  });
});

describe('upload failures from the transport', () => {
  it('network and timeout errors pass through as ApiErrors', async () => {
    const net = setup(async () => {
      throw ApiError.network();
    });
    await expect(net.client.upload('/x', form(), UploadedSchema)).rejects.toMatchObject({ kind: 'network' });
    const slow = setup(async () => {
      throw ApiError.timeout();
    });
    await expect(slow.client.upload('/x', form(), UploadedSchema)).rejects.toMatchObject({ kind: 'timeout' });
  });

  it('a cancel (AbortError) is passed on as it is, never turned into a network error', async () => {
    const abort = new Error('Aborted');
    abort.name = 'AbortError';
    const { client } = setup(async () => {
      throw abort;
    });
    await expect(client.upload('/x', form(), UploadedSchema)).rejects.toBe(abort);
  });

  it('an unknown transport failure becomes a network error', async () => {
    const { client } = setup(async () => {
      throw new TypeError('boom');
    });
    await expect(client.upload('/x', form(), UploadedSchema)).rejects.toMatchObject({ kind: 'network' });
  });

  it('without a transport (Node tools) it says so clearly instead of crashing later', async () => {
    const client = createApiClient({ baseUrl: 'http://api.test', appVersion: '1', platform: 'node' });
    await expect(client.upload('/x', form(), UploadedSchema)).rejects.toThrow(/upload transport/i);
  });
});
