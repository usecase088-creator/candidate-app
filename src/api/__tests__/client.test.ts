import { delay, http, HttpResponse } from 'msw';
import { z } from 'zod';

import { API } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';

import { createApiClient } from '../client';
import { ApiError } from '../errors';

const Thing = z.object({ id: z.string(), name: z.string() });
const Ok = z.object({ ok: z.boolean() });

function makeClient(overrides: Partial<Parameters<typeof createApiClient>[0]> = {}) {
  return createApiClient({ baseUrl: API, appVersion: '1.2.3', platform: 'android', ...overrides });
}

/** Records every request the server sees for one path. */
function capture(method: 'get' | 'post' | 'put' | 'patch' | 'delete', path: string, reply: () => Response) {
  const seen: Request[] = [];
  server.use(
    http[method](`${API}${path}`, ({ request }) => {
      seen.push(request.clone());
      return reply();
    }),
  );
  return seen;
}

async function rejection(p: Promise<unknown>): Promise<ApiError> {
  try {
    await p;
  } catch (e) {
    if (e instanceof ApiError) return e;
    throw e;
  }
  throw new Error('expected the request to fail');
}

describe('requests', () => {
  it('GETs base URL + path and returns the parsed body', async () => {
    const seen = capture('get', '/api/things/1', () => HttpResponse.json({ id: '1', name: 'A' }));
    await expect(makeClient().get('/api/things/1', Thing)).resolves.toEqual({ id: '1', name: 'A' });
    expect(seen[0].url).toBe(`${API}/api/things/1`);
  });

  it('adds query parameters, skipping undefined values', async () => {
    const seen = capture('get', '/api/jobs', () => HttpResponse.json({ ok: true }));
    await makeClient().get('/api/jobs', Ok, { query: { q: 'nurse care', page: 2, city: undefined } });
    expect(seen[0].url).toBe(`${API}/api/jobs?q=nurse+care&page=2`);
  });

  it.each(['post', 'put', 'patch'] as const)('%s sends a JSON body', async (method) => {
    const seen = capture(method, '/api/things', () => HttpResponse.json({ ok: true }));
    await makeClient()[method]('/api/things', { name: 'A', n: 1 }, Ok);
    expect(seen[0].headers.get('content-type')).toBe('application/json');
    expect(await seen[0].json()).toEqual({ name: 'A', n: 1 });
  });

  it('DELETE works without a body', async () => {
    const seen = capture('delete', '/api/things/1', () => HttpResponse.json({ ok: true }));
    await expect(makeClient().delete('/api/things/1', Ok)).resolves.toEqual({ ok: true });
    expect(seen[0].headers.get('content-type')).toBeNull();
  });

  it('deleteJson sends a JSON body with DELETE', async () => {
    const seen = capture('delete', '/api/things', () => HttpResponse.json({ ok: true }));
    await expect(makeClient().deleteJson('/api/things', { token: 'x' }, Ok)).resolves.toEqual({ ok: true });
    expect(seen[0].headers.get('content-type')).toBe('application/json');
    expect(await seen[0].json()).toEqual({ token: 'x' });
  });

  it('accepts an empty success body when the schema allows it', async () => {
    capture('delete', '/api/things/1', () => new HttpResponse(null, { status: 204 }));
    await expect(makeClient().delete('/api/things/1', z.undefined())).resolves.toBeUndefined();
  });
});

describe('headers', () => {
  it('sends X-App-Version, X-Platform and Accept on every call', async () => {
    const seen = capture('get', '/api/things/1', () => HttpResponse.json({ id: '1', name: 'A' }));
    await makeClient().get('/api/things/1', Thing);
    expect(seen[0].headers.get('x-app-version')).toBe('1.2.3');
    expect(seen[0].headers.get('x-platform')).toBe('android');
    expect(seen[0].headers.get('accept')).toBe('application/json');
  });

  it('sends no Authorization header when signed out', async () => {
    const seen = capture('get', '/api/things/1', () => HttpResponse.json({ id: '1', name: 'A' }));
    await makeClient().get('/api/things/1', Thing);
    expect(seen[0].headers.get('authorization')).toBeNull();
  });

  it('sends the bearer token when signed in, and stops after sign-out', async () => {
    const seen = capture('get', '/api/things/1', () => HttpResponse.json({ id: '1', name: 'A' }));
    const client = makeClient();
    client.setAuthToken('tok-123');
    await client.get('/api/things/1', Thing);
    client.setAuthToken(null);
    await client.get('/api/things/1', Thing);
    expect(seen[0].headers.get('authorization')).toBe('Bearer tok-123');
    expect(seen[1].headers.get('authorization')).toBeNull();
  });
});

describe('errors', () => {
  it('turns { error } responses into http ApiErrors', async () => {
    capture('post', '/api/auth/register', () =>
      HttpResponse.json({ error: 'Email is already registered' }, { status: 409 }),
    );
    const err = await rejection(makeClient().post('/api/auth/register', {}, Ok));
    expect(err).toMatchObject({ kind: 'http', status: 409, message: 'Email is already registered' });
  });

  it('handles non-JSON error pages (e.g. a proxy 502)', async () => {
    capture('get', '/api/things/1', () => new HttpResponse('<html>Bad gateway</html>', { status: 502 }));
    const err = await rejection(makeClient().get('/api/things/1', Thing));
    expect(err).toMatchObject({
      kind: 'http',
      status: 502,
      message: 'Server error. Please try again in a moment.',
    });
  });

  it('rejects a response that does not match the schema with a parse error, and reports it', async () => {
    capture('get', '/api/things/1', () => HttpResponse.json({ id: 1, secret: 'x' }));
    const reportError = jest.fn();
    const err = await rejection(makeClient({ reportError }).get('/api/things/1', Thing));
    expect(err).toMatchObject({ kind: 'parse', status: 200, path: '/api/things/1' });
    expect(err.issues).toEqual(
      expect.arrayContaining([expect.stringMatching(/^id: /), expect.stringMatching(/^name: /)]),
    );
    expect(JSON.stringify(err.issues)).not.toContain('secret');
    expect(reportError).toHaveBeenCalledWith(err);
  });

  it('can register the error reporter after creating the client', async () => {
    capture('get', '/api/things/1', () => HttpResponse.json({ id: 1 }));
    const client = makeClient();
    const reporter = jest.fn();
    client.setErrorReporter(reporter);
    const err = await rejection(client.get('/api/things/1', Thing));
    expect(reporter).toHaveBeenCalledWith(err);
  });

  it('does not report HTTP or network errors (expected, not a contract break)', async () => {
    capture('get', '/api/things/1', () => HttpResponse.json({ error: 'nope' }, { status: 404 }));
    const reportError = jest.fn();
    await rejection(makeClient({ reportError }).get('/api/things/1', Thing));
    expect(reportError).not.toHaveBeenCalled();
  });

  it('treats a success body that is not JSON as a parse error', async () => {
    capture('get', '/api/things/1', () => new HttpResponse('hello', { status: 200 }));
    const err = await rejection(makeClient().get('/api/things/1', Thing));
    expect(err.kind).toBe('parse');
  });

  it('allows extra fields when the schema is loose (backend adds fields freely)', async () => {
    capture('get', '/api/things/1', () => HttpResponse.json({ id: '1', name: 'A', extra: true }));
    await expect(makeClient().get('/api/things/1', Thing.loose())).resolves.toEqual({
      id: '1',
      name: 'A',
      extra: true,
    });
  });
});

describe('timeout', () => {
  it('gives up after the timeout with a timeout ApiError', async () => {
    server.use(
      http.get(`${API}/api/slow`, async () => {
        await delay('infinite');
        return HttpResponse.json({ ok: true });
      }),
    );
    const err = await rejection(makeClient({ timeoutMs: 50 }).get('/api/slow', Ok));
    expect(err.kind).toBe('timeout');
  });

  it('defaults to 20 seconds', () => {
    expect(makeClient().timeoutMs).toBe(20_000);
  });

  it('a caller abort is not reported as a timeout', async () => {
    server.use(
      http.get(`${API}/api/slow`, async () => {
        await delay('infinite');
        return HttpResponse.json({ ok: true });
      }),
    );
    const controller = new AbortController();
    const p = makeClient().get('/api/slow', Ok, { signal: controller.signal });
    controller.abort();
    await expect(p).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('retries', () => {
  it('retries a GET once after a network error', async () => {
    let calls = 0;
    server.use(
      http.get(`${API}/api/things/1`, () => {
        calls += 1;
        return calls === 1 ? HttpResponse.error() : HttpResponse.json({ id: '1', name: 'A' });
      }),
    );
    await expect(makeClient().get('/api/things/1', Thing)).resolves.toEqual({ id: '1', name: 'A' });
    expect(calls).toBe(2);
  });

  it('gives up after the second network error', async () => {
    let calls = 0;
    server.use(
      http.get(`${API}/api/things/1`, () => {
        calls += 1;
        return HttpResponse.error();
      }),
    );
    const err = await rejection(makeClient().get('/api/things/1', Thing));
    expect(err.kind).toBe('network');
    expect(calls).toBe(2);
  });

  it.each(['post', 'put', 'patch', 'delete'] as const)('never retries %s', async (method) => {
    let calls = 0;
    server.use(
      http[method](`${API}/api/things`, () => {
        calls += 1;
        return HttpResponse.error();
      }),
    );
    const client = makeClient();
    const p = method === 'delete' ? client.delete('/api/things', Ok) : client[method]('/api/things', {}, Ok);
    expect((await rejection(p)).kind).toBe('network');
    expect(calls).toBe(1);
  });

  it('does not retry HTTP errors', async () => {
    let calls = 0;
    server.use(
      http.get(`${API}/api/things/1`, () => {
        calls += 1;
        return HttpResponse.json({ error: 'Internal Server Error' }, { status: 500 });
      }),
    );
    await rejection(makeClient().get('/api/things/1', Thing));
    expect(calls).toBe(1);
  });
});

describe('session expiry (401)', () => {
  const expired = () => HttpResponse.json({ error: 'Invalid or expired token' }, { status: 401 });

  it('calls the hook once, even when several signed-in requests fail together', async () => {
    capture('get', '/api/a', expired);
    capture('get', '/api/b', expired);
    const onSessionExpired = jest.fn();
    const client = makeClient({ onSessionExpired });
    client.setAuthToken('tok');
    await Promise.all([rejection(client.get('/api/a', Ok)), rejection(client.get('/api/b', Ok))]);
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('still rejects the request with a 401 ApiError', async () => {
    capture('get', '/api/a', expired);
    const client = makeClient({ onSessionExpired: jest.fn() });
    client.setAuthToken('tok');
    expect((await rejection(client.get('/api/a', Ok))).isUnauthorized).toBe(true);
  });

  it('does not call the hook for requests made without a token (e.g. wrong password at login)', async () => {
    capture('post', '/api/auth/login', () =>
      HttpResponse.json({ error: 'Invalid email or password' }, { status: 401 }),
    );
    const onSessionExpired = jest.fn();
    await rejection(makeClient({ onSessionExpired }).post('/api/auth/login', {}, Ok));
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('arms the hook again after a new sign-in', async () => {
    capture('get', '/api/a', expired);
    const onSessionExpired = jest.fn();
    const client = makeClient({ onSessionExpired });
    client.setAuthToken('first');
    await rejection(client.get('/api/a', Ok));
    client.setAuthToken('second');
    await rejection(client.get('/api/a', Ok));
    expect(onSessionExpired).toHaveBeenCalledTimes(2);
  });

  it('can register the hook after creating the client', async () => {
    capture('get', '/api/a', expired);
    const client = makeClient();
    const hook = jest.fn();
    client.setSessionExpiredHandler(hook);
    client.setAuthToken('tok');
    await rejection(client.get('/api/a', Ok));
    expect(hook).toHaveBeenCalledTimes(1);
  });
});

describe('refreshing the session on 401', () => {
  /** A server where `fresh` is the only token that works. */
  function serverWith(fresh: string) {
    const seen: string[] = [];
    server.use(
      http.get(`${API}/api/a`, ({ request }) => {
        const auth = request.headers.get('authorization') ?? '';
        seen.push(auth);
        return auth === `Bearer ${fresh}`
          ? HttpResponse.json({ ok: true })
          : HttpResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
      }),
    );
    return seen;
  }

  it('gets a new access token, retries the request once, and nobody is signed out', async () => {
    const seen = serverWith('new');
    const onSessionExpired = jest.fn();
    const client = makeClient({ onSessionExpired });
    const refresh = jest.fn(async () => {
      client.setAuthToken('new');
      return 'new';
    });
    client.setRefreshHandler(refresh);
    client.setAuthToken('old');
    await expect(client.get('/api/a', Ok)).resolves.toEqual({ ok: true });
    expect(seen).toEqual(['Bearer old', 'Bearer new']);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('parallel 401s refresh once, and every request is retried with the new token', async () => {
    const seen = serverWith('new');
    const client = makeClient();
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const refresh = jest.fn(async () => {
      await gate;
      client.setAuthToken('new');
      return 'new';
    });
    client.setRefreshHandler(refresh);
    client.setAuthToken('old');
    const all = Promise.all([client.get('/api/a', Ok), client.get('/api/a', Ok), client.get('/api/a', Ok)]);
    await new Promise((r) => setTimeout(r, 50));
    release();
    await expect(all).resolves.toHaveLength(3);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(seen.filter((s) => s === 'Bearer new')).toHaveLength(3);
  });

  it('ends the session when the refresh itself says no, and still rejects with 401', async () => {
    serverWith('never');
    const onSessionExpired = jest.fn();
    const client = makeClient({ onSessionExpired });
    client.setRefreshHandler(async () => null);
    client.setAuthToken('old');
    const err = await rejection(client.get('/api/a', Ok));
    expect(err.isUnauthorized).toBe(true);
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('keeps the session when the refresh could not reach the server (offline)', async () => {
    serverWith('never');
    const onSessionExpired = jest.fn();
    const client = makeClient({ onSessionExpired });
    client.setRefreshHandler(async () => {
      throw ApiError.network();
    });
    client.setAuthToken('old');
    const err = await rejection(client.get('/api/a', Ok));
    expect(err.kind).toBe('network');
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('tries only once: a second 401 after the refresh ends the session', async () => {
    const seen = serverWith('never');
    const onSessionExpired = jest.fn();
    const client = makeClient({ onSessionExpired });
    const refresh = jest.fn(async () => {
      client.setAuthToken('new');
      return 'new';
    });
    client.setRefreshHandler(refresh);
    client.setAuthToken('old');
    await rejection(client.get('/api/a', Ok));
    expect(seen).toEqual(['Bearer old', 'Bearer new']);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('does not try to refresh for the sign-in, refresh or sign-out calls themselves', async () => {
    for (const path of ['/api/auth/login', '/api/auth/refresh', '/api/auth/logout']) {
      capture('post', path, () => HttpResponse.json({ error: 'no' }, { status: 401 }));
    }
    const refresh = jest.fn(async () => 'x');
    const client = makeClient();
    client.setRefreshHandler(refresh);
    client.setAuthToken('old');
    for (const path of ['/api/auth/login', '/api/auth/refresh', '/api/auth/logout']) {
      await rejection(client.post(path, {}, Ok));
    }
    expect(refresh).not.toHaveBeenCalled();
  });

  it('without a token (wrong password) nothing is refreshed', async () => {
    capture('post', '/api/auth/login', () => HttpResponse.json({ error: 'no' }, { status: 401 }));
    const refresh = jest.fn(async () => 'x');
    const client = makeClient();
    client.setRefreshHandler(refresh);
    await rejection(client.post('/api/auth/login', {}, Ok));
    expect(refresh).not.toHaveBeenCalled();
  });

  it('tells the server it can use refresh tokens', async () => {
    const seen = capture('get', '/api/a', () => HttpResponse.json({ ok: true }));
    await makeClient().get('/api/a', Ok);
    expect(seen[0].headers.get('x-refresh-capable')).toBe('1');
  });
});
