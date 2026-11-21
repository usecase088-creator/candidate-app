import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * D32 haptic vocabulary (docs/design/UI-REDESIGN.md). Each kind has one meaning, used consistently:
 * - selection: a value changed (chip, segmented control, picker)
 * - light: a small UI event landed (save / unsave, toggle, pull-to-refresh trigger, sheet snap)
 * - medium: a primary action landed (Apply, Submit, Sign in)
 * - success / warning / error: the outcome of a task
 * Never on plain navigation taps. Fire-and-forget: a phone without a haptic engine must never break a press.
 */
export type HapticKind = 'none' | 'selection' | 'light' | 'medium' | 'success' | 'warning' | 'error';

const ANDROID: Record<Exclude<HapticKind, 'none'>, Haptics.AndroidHaptics> = {
  selection: Haptics.AndroidHaptics.Segment_Tick,
  light: Haptics.AndroidHaptics.Context_Click,
  medium: Haptics.AndroidHaptics.Confirm,
  success: Haptics.AndroidHaptics.Confirm,
  warning: Haptics.AndroidHaptics.Reject,
  error: Haptics.AndroidHaptics.Reject,
};

function run(kind: Exclude<HapticKind, 'none'>): Promise<void> {
  if (Platform.OS === 'android') return Haptics.performAndroidHapticsAsync(ANDROID[kind]);
  switch (kind) {
    case 'selection':
      return Haptics.selectionAsync();
    case 'light':
      return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    case 'medium':
      return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    case 'success':
      return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    case 'warning':
      return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    case 'error':
      return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }
}

export function haptic(kind: HapticKind): void {
  if (kind === 'none' || Platform.OS === 'web') return;
  try {
    void run(kind).catch(() => undefined);
  } catch {
    // Haptics are a nicety: never let them break a press.
  }
}
