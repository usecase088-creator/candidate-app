// Session state (PLAN.md §2 "Auth"). The token lives in SecureStore and in the API client, never in this state.
// 401 anywhere → signOut('expired') through the client's session-expired hook.
import { create } from 'zustand';

import { api } from '@/api/client';
import { isApiError } from '@/api/errors';
import { type AuthUser, AuthUserSchema, MeResponseSchema, RefreshResponseSchema } from '@/api/schemas/auth';
import { z } from 'zod';
import { BUILDER_STEP_KEY } from '@/features/profile/builder/useBuilderStep';
import { disablePush, PUSH_TOKEN_KEY } from '@/features/push/pushService';
import { secureStorage } from '@/lib/secureStorage';

export const TOKEN_KEY = 'auth.token';
export const USER_KEY = 'auth.user';
/** Long-lived token that renews the access token. Same rule as the access token: SecureStore only. */
export const REFRESH_KEY = 'auth.refresh';

/**
 * user: they tapped Sign out · expired: token rejected or unreadable · blocked: account suspended/deleted (403) ·
 * deleted: they deleted their own account (nothing more to tell the server).
 */
export type SignOutReason = 'user' | 'expired' | 'blocked' | 'deleted';

type SessionState = {
  status: 'restoring' | 'signedOut' | 'signedIn';
  /** Null when signed in offline without a saved user. */
  user: AuthUser | null;
  signOutReason?: SignOutReason;
  /** Backend wording to show on the login screen (blocked accounts). */
  signOutMessage?: string;
  restore: () => Promise<void>;
  signIn: (token: string, user: AuthUser, refreshToken?: string) => Promise<void>;
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
  await Promise.all([
    secureStorage.deleteItem(TOKEN_KEY),
    secureStorage.deleteItem(USER_KEY),
    secureStorage.deleteItem(REFRESH_KEY),
    // Belong to the person who just left: the push token and where they stopped in the profile form.
    secureStorage.deleteItem(PUSH_TOKEN_KEY),
    secureStorage.deleteItem(BUILDER_STEP_KEY),
  ]);
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
      // A refresh that found the account blocked has already signed the user out, with the reason.
      if (get().status === 'signedOut') return;
      if (isApiError(e) && e.isUnauthorized) return get().signOut('expired');
      if (isApiError(e) && e.kind === 'http' && e.status === 403)
        return get().signOut('blocked', e.serverMessage);
      if (isApiError(e) && e.kind === 'parse') return get().signOut('expired');
      // Offline, timeout or server trouble: keep the session; screens show their own offline/error states.
      set({ status: 'signedIn', user: await readSavedUser() });
    }
  },

  async signIn(token, user, refreshToken) {
    if (!isCandidate(user)) throw new Error('Only CANDIDATE accounts can sign in to the app.');
    try {
      await secureStorage.setItem(TOKEN_KEY, token);
      await secureStorage.setItem(USER_KEY, JSON.stringify(user));
      if (refreshToken) await secureStorage.setItem(REFRESH_KEY, refreshToken);
      else await secureStorage.deleteItem(REFRESH_KEY);
    } catch (e) {
      await clearStorage();
      throw e;
    }
    api.setAuthToken(token);
    set({ status: 'signedIn', user, signOutReason: undefined, signOutMessage: undefined });
  },

  async signOut(reason = 'user', message) {
    // This phone stops getting this person's notifications. Only when they chose to sign out (the token is still
    // valid) and never for longer than a moment: signing out must work offline.
    if (reason === 'user') {
      await Promise.race([
        Promise.all([disablePush(), endServerSession()]),
        new Promise<void>((resolve) => setTimeout(resolve, 3000)),
      ]);
    }
    api.setAuthToken(null);
    set({ status: 'signedOut', user: null, signOutReason: reason, signOutMessage: message });
    await clearStorage();
  },
}));

const Ok = z.object({ success: z.boolean() }).loose();

/** Tells the server this sign-in is over (its refresh tokens stop working). Best effort: sign-out works offline. */
async function endServerSession() {
  try {
    const refreshToken = await secureStorage.getItem(REFRESH_KEY);
    if (refreshToken) await api.post('/api/auth/logout', { refreshToken }, Ok);
  } catch {
    // Offline or already expired: the refresh token is deleted from the phone anyway.
  }
}

/**
 * The API client calls this when the access token is rejected. Swaps the refresh token for new tokens and stores them.
 * null = the sign-in is really over. A network problem throws, so the user stays signed in.
 */
async function refreshSession(): Promise<string | null> {
  const refreshToken = await secureStorage.getItem(REFRESH_KEY);
  if (!refreshToken) return null;
  try {
    const res = await api.post('/api/auth/refresh', { refreshToken }, RefreshResponseSchema);
    await secureStorage.setItem(TOKEN_KEY, res.token);
    await secureStorage.setItem(REFRESH_KEY, res.refreshToken);
    api.setAuthToken(res.token);
    return res.token;
  } catch (e) {
    if (isApiError(e) && e.kind === 'http' && e.status === 403) {
      // Suspended or deleted since the last sign-in: say so on the login screen.
      await useSession.getState().signOut('blocked', e.serverMessage);
      return null;
    }
    if (isApiError(e) && e.kind === 'http' && e.status === 401) return null;
    throw e;
  }
}
api.setRefreshHandler(refreshSession);

api.setSessionExpiredHandler(() => {
  if (useSession.getState().status !== 'signedOut') void useSession.getState().signOut('expired');
});

/** Jest only: back to the first-launch state. */
export function resetSessionForTests() {
  api.setAuthToken(null);
  useSession.setState(initialState);
}
