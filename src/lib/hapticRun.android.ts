import * as Haptics from 'expo-haptics';

import type { HapticKind } from './haptics';

/** Android: the performHapticFeedback constants (no VIBRATE permission needed). */
const ANDROID: Record<Exclude<HapticKind, 'none'>, Haptics.AndroidHaptics> = {
  selection: Haptics.AndroidHaptics.Segment_Tick,
  light: Haptics.AndroidHaptics.Context_Click,
  medium: Haptics.AndroidHaptics.Confirm,
  success: Haptics.AndroidHaptics.Confirm,
  warning: Haptics.AndroidHaptics.Reject,
  error: Haptics.AndroidHaptics.Reject,
};

export function runHaptic(kind: Exclude<HapticKind, 'none'>): Promise<void> {
  return Haptics.performAndroidHapticsAsync(ANDROID[kind]);
}
