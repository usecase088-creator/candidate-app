import * as SecureStore from 'expo-secure-store';
import { http, HttpResponse } from 'msw';
import { z } from 'zod';

import { api } from '@/api/client';
import { MeResponseSchema } from '@/api/schemas/auth';
import { candidateUser, meResponse, recruiterUser } from '@/test/fixtures/auth';
import { API } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { secureStorage } from '@/lib/secureStorage';

import { resetSessionForTests, TOKEN_KEY, USER_KEY, useSession } from '../sessionStore';

const fake = SecureStore as typeof SecureStore & { __reset: () => void };
const me = (reply: () => Response) => {
  const seen: Request[] = [];
  server.use(
    http.get(`${API}/api/auth/me`, ({ request }) => {
      seen.push(request.clone());
      return reply();
    }),
  );
  return seen;
};
const state = () => useSession.getState();

async function storeSession(token = 'stored-token', user: unknown = candidateUser) {
  await secureStorage.setItem(TOKEN_KEY, token);
  if (user) await secureStorage.setItem(USER_KEY, JSON.stringify(user));
}

beforeEach(() => {
  fake.__reset();
  jest.clearAllMocks();
  resetSessionForTests();
});

it('starts in restoring', () => {
  expect(state().status).toBe('restoring');
});

describe('restore', () => {
  it('signs out without a network call when no token is stored', async () => {
    await state().restore();
    expect(state()).toMatchObject({ status: 'signedOut', user: null, signOutReason: undefined });
  });

  it('checks the stored token with /api/auth/me and signs in with the fresh user', async () => {
    await storeSession('stored-token', { ...candidateUser, name: 'Old Name' });
    const seen = me(() => HttpResponse.json(meResponse));
    await state().restore();
    expect(seen[0].headers.get('authorization')).toBe('Bearer stored-token');
    expect(state()).toMatchObject({ status: 'signedIn', user: { name: 'Test Candidate' } });
    expect(JSON.parse((await secureStorage.getItem(USER_KEY)) ?? '{}')).toMatchObject({
      name: 'Test Candidate',
    });
  });

  it('clears an expired token (401) and says why', async () => {
    await storeSession();
    me(() => HttpResponse.json({ error: 'Invalid or expired token' }, { status: 401 }));
    await state().restore();
    expect(state()).toMatchObject({ status: 'signedOut', signOutReason: 'expired' });
    await expect(secureStorage.getItem(TOKEN_KEY)).resolves.toBeNull();
    await expect(secureStorage.getItem(USER_KEY)).resolves.toBeNull();
  });

  it('clears a blocked account (403) and keeps the backend message', async () => {
    await storeSession();
    me(() =>
      HttpResponse.json({ error: 'Your account has been suspended. Contact support.' }, { status: 403 }),
    );
    await state().restore();
    expect(state()).toMatchObject({
      status: 'signedOut',
      signOutReason: 'blocked',
      signOutMessage: 'Your account has been suspended. Contact support.',
    });
    await expect(secureStorage.getItem(TOKEN_KEY)).resolves.toBeNull();
  });

  it('clears the session when /me answers in an unexpected shape', async () => {
    await storeSession();
    me(() => HttpResponse.json({ nope: true }));
    await state().restore();
    expect(state()).toMatchObject({ status: 'signedOut', signOutReason: 'expired' });
    await expect(secureStorage.getItem(TOKEN_KEY)).resolves.toBeNull();
  });

  it('clears a stored session that is not a candidate', async () => {
    await storeSession();
    me(() => HttpResponse.json({ user: recruiterUser }));
    await state().restore();
    expect(state().status).toBe('signedOut');
    await expect(secureStorage.getItem(TOKEN_KEY)).resolves.toBeNull();
  });

  it('keeps the session offline, using the saved user', async () => {
    await storeSession();
    me(() => HttpResponse.error());
    await state().restore();
    expect(state()).toMatchObject({ status: 'signedIn', user: { email: 'candidate@apronhanger.test' } });
    await expect(secureStorage.getItem(TOKEN_KEY)).resolves.toBe('stored-token');
  });

  it('keeps the session offline even without a saved user', async () => {
    await storeSession('stored-token', null);
    me(() => HttpResponse.error());
    await state().restore();
    expect(state()).toMatchObject({ status: 'signedIn', user: null });
  });

  it('ignores a saved user that no longer parses', async () => {
    await storeSession();
    await secureStorage.setItem(USER_KEY, '{broken');
    me(() => HttpResponse.error());
    await state().restore();
    expect(state()).toMatchObject({ status: 'signedIn', user: null });
  });

  it('keeps the session when the server is down (5xx)', async () => {
    await storeSession();
    me(() => HttpResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 }));
    await state().restore();
    expect(state().status).toBe('signedIn');
    await expect(secureStorage.getItem(TOKEN_KEY)).resolves.toBe('stored-token');
  });
});

describe('signIn', () => {
  it('saves token and user, signs in, and authorises later requests', async () => {
    await state().signIn('new-token', candidateUser);
    expect(state()).toMatchObject({ status: 'signedIn', user: { id: candidateUser.id } });
    await expect(secureStorage.getItem(TOKEN_KEY)).resolves.toBe('new-token');
    const seen = me(() => HttpResponse.json(meResponse));
    await api.get('/api/auth/me', MeResponseSchema);
    expect(seen[0].headers.get('authorization')).toBe('Bearer new-token');
  });

  it('refuses a non-candidate user and stores nothing', async () => {
    await expect(state().signIn('rec-token', recruiterUser)).rejects.toThrow(/CANDIDATE/);
    await expect(secureStorage.getItem(TOKEN_KEY)).resolves.toBeNull();
    expect(state().status).toBe('restoring');
  });

  it('stays signed out when the token cannot be saved', async () => {
    await state().restore();
    jest.mocked(SecureStore.setItemAsync).mockRejectedValueOnce(new Error('keystore full'));
    await expect(state().signIn('new-token', candidateUser)).rejects.toThrow('keystore full');
    expect(state().status).toBe('signedOut');
  });
});

describe('signOut', () => {
  it('clears storage and the client token', async () => {
    await state().signIn('new-token', candidateUser);
    await state().signOut();
    expect(state()).toMatchObject({ status: 'signedOut', user: null, signOutReason: 'user' });
    await expect(secureStorage.getItem(TOKEN_KEY)).resolves.toBeNull();
    await expect(secureStorage.getItem(USER_KEY)).resolves.toBeNull();
    const seen = me(() => HttpResponse.json({ error: 'Unauthorized' }, { status: 401 }));
    await api.get('/api/auth/me', MeResponseSchema).catch(() => undefined);
    expect(seen[0].headers.get('authorization')).toBeNull();
  });

  it('happens automatically when any signed-in request gets 401', async () => {
    await state().signIn('new-token', candidateUser);
    server.use(
      http.get(`${API}/api/saved-jobs`, () =>
        HttpResponse.json({ error: 'Session invalidated. Please log in again.' }, { status: 401 }),
      ),
    );
    await api.get('/api/saved-jobs', z.array(z.unknown())).catch(() => undefined);
    await new Promise((r) => setTimeout(r, 0));
    expect(state()).toMatchObject({ status: 'signedOut', signOutReason: 'expired' });
    await expect(secureStorage.getItem(TOKEN_KEY)).resolves.toBeNull();
  });
});
