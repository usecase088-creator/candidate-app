// TanStack Query wired to React Native (PLAN.md §2 "Offline/slow network"): online state from expo-network,
// focus from AppState, and a retry policy that only repeats what can succeed on a second try.
import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';
import * as Network from 'expo-network';
import { AppState } from 'react-native';

import { isApiError } from '@/api/errors';

const MAX_QUERY_RETRIES = 2;

function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_QUERY_RETRIES || !isApiError(error)) return false;
  if (error.kind === 'network' || error.kind === 'timeout') return true;
  return error.kind === 'http' && (error.status ?? 0) >= 500;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: shouldRetry, staleTime: 30_000 },
      mutations: { retry: false },
    },
  });
}

const isOnline = (s: { isConnected?: boolean; isInternetReachable?: boolean }) =>
  s.isConnected !== false && s.isInternetReachable !== false;

/** Call once at app start. Returns a cleanup function. */
export function setupOnlineManager(): () => void {
  let remove: () => void = () => undefined;
  onlineManager.setEventListener((setOnline) => {
    void Network.getNetworkStateAsync()
      .then((s) => setOnline(isOnline(s)))
      .catch(() => undefined);
    const subscription = Network.addNetworkStateListener((s) => setOnline(isOnline(s)));
    remove = () => subscription.remove();
    return remove;
  });
  return () => remove();
}

/** Call once at app start. Returns a cleanup function. */
export function setupFocusManager(): () => void {
  const subscription = AppState.addEventListener('change', (status) => {
    focusManager.setFocused(status === 'active');
  });
  return () => subscription.remove();
}

/** The app's one QueryClient (root layout). Cleared on sign-out so no data from the previous user survives. */
export const appQueryClient = createQueryClient();
