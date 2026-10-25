import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from '@/components/ui/Toast';
import { FontGate } from '@/theme/FontGate';

// Keep the splash up until FontGate has Inter ready. Task 7 adds session restore, Sentry and the query client.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <FontGate>
        <ToastProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </ToastProvider>
      </FontGate>
    </SafeAreaProvider>
  );
}
