// Starts the real app (all routes) with a stored session, for screen tests of signed-in screens.
// Each test file must itself `jest.mock('expo-font', ...)` and `jest.mock('expo-splash-screen', ...)` like
// navigation.test.tsx, and call `useFonts` mock in beforeEach.
import { renderRouter, screen } from 'expo-router/testing-library';
import * as SecureStore from 'expo-secure-store';
import { http, HttpResponse } from 'msw';

import { resetSessionForTests, TOKEN_KEY } from '@/features/auth/sessionStore';
import { useFilterStore } from '@/features/jobs/filterStore';
import { appQueryClient } from '@/lib/queryClient';
import { secureStorage } from '@/lib/secureStorage';
import { appRoutes } from '@/test/appRoutes';
import { meResponse } from '@/test/fixtures/auth';
import { API } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';

const fake = SecureStore as typeof SecureStore & { __reset: () => void };

/** Call in beforeEach: clean storage, session, filters and cache. */
export function resetAppState() {
  fake.__reset();
  resetSessionForTests();
  useFilterStore.getState().resetAll();
  appQueryClient.clear();
  // No waiting for retries in error-state tests (the retry rule itself is tested in queryClient.test.ts).
  appQueryClient.setDefaultOptions({
    queries: { retry: false, staleTime: 30_000 },
    mutations: { retry: false },
  });
}

export async function startSignedIn(initialUrl: string, expectTestId: string) {
  await secureStorage.setItem(TOKEN_KEY, 'stored-token');
  server.use(http.get(`${API}/api/auth/me`, () => HttpResponse.json(meResponse)));
  const app = await renderRouter(appRoutes, { initialUrl });
  await screen.findByTestId(expectTestId);
  return app;
}
