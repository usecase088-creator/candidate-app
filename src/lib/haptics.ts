import { runHaptic } from './hapticRun';

/**
 * D32 haptic vocabulary (docs/design/UI-REDESIGN.md). Each kind has one meaning, used consistently:
 * - selection: a value changed (chip, segmented control, picker)
 * - light: a small UI event landed (save / unsave, toggle, pull-to-refresh trigger, sheet snap)
 * - medium: a primary action landed (Apply, Submit, Sign in)
 * - success / warning / error: the outcome of a task
 * Never on plain navigation taps. Fire-and-forget: a phone without a haptic engine must never break a press.
 * The platform patterns live in hapticRun.ios.ts / hapticRun.android.ts / hapticRun.ts (web no-op).
 */
export type HapticKind = 'none' | 'selection' | 'light' | 'medium' | 'success' | 'warning' | 'error';

export function haptic(kind: HapticKind): void {
  if (kind === 'none') return;
  try {
    void runHaptic(kind).catch(() => undefined);
  } catch {
    // Haptics are a nicety: never let them break a press.
  }
}
