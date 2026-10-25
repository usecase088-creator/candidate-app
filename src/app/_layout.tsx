import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { api } from '@/api/client';
import { ToastProvider } from '@/components/ui/Toast';
import { useSession } from '@/features/auth/sessionStore';
import { getEnv } from '@/lib/env';
import { appQueryClient, setupFocusManager, setupOnlineManager } from '@/lib/queryClient';
import { initSentry, reportApiError } from '@/lib/sentry';
import { FontGate } from '@/theme/FontGate';

// Splash stays until fonts are loaded and the stored session has been checked (FontGate holdSplash).
void SplashScreen.preventAutoHideAsync();
initSentry(getEnv());
api.setErrorReporter(reportApiError);

export default function RootLayout() {
  const status = useSession((s) => s.status);

  useEffect(() => {
    void useSession.getState().restore();
    const stopOnline = setupOnlineManager();
    const stopFocus = setupFocusManager();
    // Sign-out (button, expired token, 401): drop every cached query of that user.
    const stopClearing = useSession.subscribe((state, prev) => {
      if (prev.status === 'signedIn' && state.status === 'signedOut') appQueryClient.clear();
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
            <Stack screenOptions={{ headerShown: false }} />
          </ToastProvider>
        </FontGate>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
