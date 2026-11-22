import type { HapticKind } from './haptics';

/** Web (Playwright checks only): no haptics. Native patterns live in hapticRun.ios.ts / hapticRun.android.ts. */
export function runHaptic(_kind: Exclude<HapticKind, 'none'>): Promise<void> {
  return Promise.resolve();
}
