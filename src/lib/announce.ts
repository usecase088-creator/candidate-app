import { AccessibilityInfo } from 'react-native';

/** The same message twice within this window is spoken once (a toast and an inline box often say the same thing). */
export const ANNOUNCE_DEDUPE_MS = 1000;
let last = { message: '', at: -Infinity };

/**
 * Speaks a message with VoiceOver / TalkBack (R3 a11y P1-1). `accessibilityRole="alert"` is not announced on iOS, and an
 * Android live region is reliable only when its View already exists, so errors, toasts and status messages call this.
 * No-op when no screen reader runs (the OS ignores it); never throws.
 */
export function announce(message: string): void {
  if (!message.trim()) return;
  const now = Date.now();
  if (message === last.message && now - last.at < ANNOUNCE_DEDUPE_MS) return;
  last = { message, at: now };
  try {
    AccessibilityInfo.announceForAccessibility(message);
  } catch {
    // Announcements are best effort.
  }
}

/** Test runner only (src/test/jest.setup.ts): forget the last message so tests do not depend on each other's timing. */
export function resetAnnounceForTests(): void {
  last = { message: '', at: -Infinity };
}
