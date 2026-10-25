// Session state (PLAN.md §2 "Auth"). The token lives in SecureStore and in the API client, never in this state.
// 401 anywhere → signOut('expired') through the client's session-expired hook.
import { create } from 'zustand';

import { api } from '@/api/client';
import { isApiError } from '@/api/errors';
import { type AuthUser, AuthUserSchema, MeResponseSchema } from '@/api/schemas/auth';
import { secureStorage } from '@/lib/secureStorage';

export const TOKEN_KEY = 'auth.token';
export const USER_KEY = 'auth.user';

/** user: they tapped Sign out · expired: token rejected or unreadable · blocked: account suspended/deleted (403). */
export type SignOutReason = 'user' | 'expired' | 'blocked';

type SessionState = {
  status: 'restoring' | 'signedOut' | 'signedIn';
  /** Null when signed in offline without a saved user. */
  user: AuthUser | null;
  signOutReason?: SignOutReason;
  /** Backend wording to show on the login screen (blocked accounts). */
  signOutMessage?: string;
  restore: () => Promise<void>;
  signIn: (token: string, user: AuthUser) => Promise<void>;
  signOut: (reason?: SignOutReason, message?: string) => Promise<void>;
};

const isCandidate = (user: AuthUser) => user.role === 'CANDIDATE';

async function readSavedUser(): Promise<AuthUser | null> {
  const raw = await secureStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    const parsed = AuthUserSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

async function clearStorage() {
  await Promise.all([secureStorage.deleteItem(TOKEN_KEY), secureStorage.deleteItem(USER_KEY)]);
}

const initialState = {
  status: 'restoring' as const,
  user: null,
  signOutReason: undefined,
  signOutMessage: undefined,
};

export const useSession = create<SessionState>()((set, get) => ({
  ...initialState,

  async restore() {
    const token = await secureStorage.getItem(TOKEN_KEY);
    if (!token) {
      set({ status: 'signedOut', user: null });
      return;
    }
    api.setAuthToken(token);
    try {
      const { user } = await api.get('/api/auth/me', MeResponseSchema);
      if (!isCandidate(user)) {
        await get().signOut('expired');
        return;
      }
      await secureStorage.setItem(USER_KEY, JSON.stringify(user));
      set({ status: 'signedIn', user, signOutReason: undefined, signOutMessage: undefined });
    } catch (e) {
      if (isApiError(e) && e.isUnauthorized) return get().signOut('expired');
      if (isApiError(e) && e.kind === 'http' && e.status === 403)
        return get().signOut('blocked', e.serverMessage);
      if (isApiError(e) && e.kind === 'parse') return get().signOut('expired');
      // Offline, timeout or server trouble: keep the session; screens show their own offline/error states.
      set({ status: 'signedIn', user: await readSavedUser() });
    }
  },

  async signIn(token, user) {
    if (!isCandidate(user)) throw new Error('Only CANDIDATE accounts can sign in to the app.');
    try {
      await secureStorage.setItem(TOKEN_KEY, token);
      await secureStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (e) {
      await clearStorage();
      throw e;
    }
    api.setAuthToken(token);
    set({ status: 'signedIn', user, signOutReason: undefined, signOutMessage: undefined });
  },

  async signOut(reason = 'user', message) {
    api.setAuthToken(null);
    set({ status: 'signedOut', user: null, signOutReason: reason, signOutMessage: message });
    await clearStorage();
  },
}));

api.setSessionExpiredHandler(() => {
  if (useSession.getState().status !== 'signedOut') void useSession.getState().signOut('expired');
});

/** Jest only: back to the first-launch state. */
export function resetSessionForTests() {
  api.setAuthToken(null);
  useSession.setState(initialState);
}
