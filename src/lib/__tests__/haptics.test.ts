import * as Haptics from 'expo-haptics';

import { haptic } from '../haptics';
import { runHaptic as runAndroid } from '../hapticRun.android';
import { runHaptic as runIos } from '../hapticRun.ios';

jest.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
  AndroidHaptics: {
    Segment_Tick: 'segTick',
    Confirm: 'confirm',
    Reject: 'reject',
    Context_Click: 'ctx',
    Toggle_On: 'toggleOn',
  },
  selectionAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  performAndroidHapticsAsync: jest.fn(() => Promise.resolve()),
}));

afterEach(() => {
  jest.clearAllMocks();
});

// D32 haptic map (HIG "Playing haptics" + expo-haptics): selection on value change, light on toggles/saves, medium when
// a primary action lands, notification for outcomes. Never on plain navigation taps (callers simply don't ask).
// Platform split per CLAUDE.md: hapticRun.ios.ts / hapticRun.android.ts / hapticRun.ts (web no-op), tested directly.
describe('haptic (iOS)', () => {
  it.each([
    ['selection', () => expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1)],
    ['light', () => expect(Haptics.impactAsync).toHaveBeenCalledWith('light')],
    ['medium', () => expect(Haptics.impactAsync).toHaveBeenCalledWith('medium')],
    ['success', () => expect(Haptics.notificationAsync).toHaveBeenCalledWith('success')],
    ['warning', () => expect(Haptics.notificationAsync).toHaveBeenCalledWith('warning')],
    ['error', () => expect(Haptics.notificationAsync).toHaveBeenCalledWith('error')],
  ] as const)('%s maps to the matching system pattern', async (kind, check) => {
    await runIos(kind);
    check();
  });
});

describe('haptic()', () => {
  it('none does nothing', () => {
    haptic('none');
    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
    expect(Haptics.performAndroidHapticsAsync).not.toHaveBeenCalled();
  });

  it('runs the platform pattern (the test runner resolves the iOS file)', () => {
    haptic('light');
    expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
  });

  it('never throws when the device has no haptics (promise rejects)', async () => {
    jest.mocked(Haptics.impactAsync).mockRejectedValueOnce(new Error('no engine'));
    expect(() => haptic('light')).not.toThrow();
    await Promise.resolve();
  });

  it('never throws when the native call throws synchronously', () => {
    jest.mocked(Haptics.impactAsync).mockImplementationOnce(() => {
      throw new Error('no module');
    });
    expect(() => haptic('medium')).not.toThrow();
  });
});

describe('haptic (Android)', () => {
  it('uses the Android patterns (no VIBRATE permission needed)', async () => {
    await runAndroid('selection');
    await runAndroid('light');
    await runAndroid('medium');
    await runAndroid('success');
    await runAndroid('error');
    expect(Haptics.performAndroidHapticsAsync).toHaveBeenCalledTimes(5);
    expect(Haptics.performAndroidHapticsAsync).toHaveBeenNthCalledWith(1, 'segTick');
    expect(Haptics.performAndroidHapticsAsync).toHaveBeenNthCalledWith(5, 'reject');
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  });
});

describe('haptic (web)', () => {
  it('is a no-op', async () => {
    // The default file is the web one; the test runner (iOS) would resolve the bare name to hapticRun.ios.ts.
    const { runHaptic: runWeb } = jest.requireActual<typeof import('../hapticRun')>('../hapticRun.ts');
    await runWeb('medium');
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
    expect(Haptics.performAndroidHapticsAsync).not.toHaveBeenCalled();
  });
});
