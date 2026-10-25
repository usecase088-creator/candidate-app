import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { type ReactNode, useEffect } from 'react';

import { fontAssets } from './fonts';

/**
 * Keeps the splash screen up until Inter is loaded, so text never flashes in the system font.
 * If loading fails the app still starts (system font) rather than staying on the splash.
 * `holdSplash`: the app needs more time (session restore); children render, the splash stays on top.
 * The root layout calls SplashScreen.preventAutoHideAsync() at module load.
 */
export function FontGate({ children, holdSplash = false }: { children: ReactNode; holdSplash?: boolean }) {
  const [loaded, error] = useFonts(fontAssets);
  const fontsReady = loaded || error !== null;

  useEffect(() => {
    if (fontsReady && !holdSplash) void SplashScreen.hideAsync();
  }, [fontsReady, holdSplash]);

  return fontsReady ? children : null;
}
