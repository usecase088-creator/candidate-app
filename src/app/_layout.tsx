import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { api } from '@/api/client';
import { ToastProvider } from '@/components/ui/Toast';
import { UpdateGate } from '@/features/appConfig/UpdateGate';
import { useSession } from '@/features/auth/sessionStore';
import { useFilterStore } from '@/features/jobs/filterStore';
import { getEnv } from '@/lib/env';
import { appQueryClient, setupFocusManager, setupOnlineManager } from '@/lib/queryClient';
import { secureStorage } from '@/lib/secureStorage';
import { initSentry, reportApiError, sendInstallCheckEvent } from '@/lib/sentry';
import { FontGate } from '@/theme/FontGate';

// Splash stays until fonts are loaded and the stored session has been checked (FontGate holdSplash).
void SplashScreen.preventAutoHideAsync();
initSentry(getEnv());
api.setErrorReporter(reportApiError);

export default function RootLayout() {
  const status = useSession((s) => s.status);

  useEffect(() => {
    void useSession.getState().restore();
    // Preview builds only, once per install (Phase 3 acceptance): one event to prove Sentry works on a real phone.
    void sendInstallCheckEvent(secureStorage);
    const stopOnline = setupOnlineManager();
    const stopFocus = setupFocusManager();
    // Sign-out (button, expired token, 401): drop every cached query and the search state of that user.
    const stopClearing = useSession.subscribe((state, prev) => {
      if (prev.status === 'signedIn' && state.status === 'signedOut') {
        appQueryClient.clear();
        useFilterStore.getState().resetAll();
      }
    });
    return () => {
      stopOnline();
      stopFocus();
      stopClearing();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={appQueryClient}>
        <FontGate holdSplash={status === 'restoring'}>
          <ToastProvider>
            {/* PLAN.md §2 "Auth": the (tabs) and (auth) layouts redirect by session status, deep links included.
                While restoring they render nothing and the splash stays on top. */}
            <UpdateGate>
              <Stack screenOptions={{ headerShown: false }} />
            </UpdateGate>
          </ToastProvider>
        </FontGate>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
