import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { type ReactNode, useEffect } from 'react';

import { fontAssets } from './fonts';

/**
 * Keeps the splash screen up until Inter is loaded, so text never flashes in the system font.
 * If loading fails the app still starts (system font) rather than staying on the splash.
 * The root layout calls SplashScreen.preventAutoHideAsync() at module load.
 */
export function FontGate({ children }: { children: ReactNode }) {
  const [loaded, error] = useFonts(fontAssets);
  const ready = loaded || error !== null;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  return ready ? children : null;
}
