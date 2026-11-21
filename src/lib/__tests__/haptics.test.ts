import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { haptic } from '../haptics';

jest.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
  AndroidHaptics: { Segment_Tick: 'segTick', Confirm: 'confirm', Reject: 'reject', Context_Click: 'ctx', Toggle_On: 'toggleOn' },
  selectionAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  performAndroidHapticsAsync: jest.fn(() => Promise.resolve()),
}));

const os = Platform.OS;
afterEach(() => {
  Platform.OS = os;
  jest.clearAllMocks();
});

// D32 haptic map (HIG "Playing haptics" + expo-haptics): selection on value change, light on toggles/saves, medium when
// a primary action lands, notification for outcomes. Never on plain navigation taps (callers simply don't ask).
describe('haptic (iOS)', () => {
  beforeEach(() => {
    Platform.OS = 'ios';
  });
  it.each([
    ['selection', () => expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1)],
    ['light', () => expect(Haptics.impactAsync).toHaveBeenCalledWith('light')],
    ['medium', () => expect(Haptics.impactAsync).toHaveBeenCalledWith('medium')],
    ['success', () => expect(Haptics.notificationAsync).toHaveBeenCalledWith('success')],
    ['warning', () => expect(Haptics.notificationAsync).toHaveBeenCalledWith('warning')],
    ['error', () => expect(Haptics.notificationAsync).toHaveBeenCalledWith('error')],
  ] as const)('%s maps to the matching system pattern', (kind, check) => {
    haptic(kind);
    check();
  });

  it('none does nothing', () => {
    haptic('none');
    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
  });

  it('never throws when the device has no haptics (promise rejects)', async () => {
    jest.mocked(Haptics.impactAsync).mockRejectedValueOnce(new Error('no engine'));
    expect(() => haptic('light')).not.toThrow();
    await Promise.resolve();
  });
});

describe('haptic (Android)', () => {
  beforeEach(() => {
    Platform.OS = 'android';
  });
  it('uses the Android patterns (no VIBRATE permission needed)', () => {
    haptic('selection');
    haptic('light');
    haptic('medium');
    haptic('success');
    haptic('error');
    expect(Haptics.performAndroidHapticsAsync).toHaveBeenCalledTimes(5);
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  });
});

describe('haptic (web)', () => {
  it('is a no-op', () => {
    Platform.OS = 'web';
    haptic('medium');
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
    expect(Haptics.performAndroidHapticsAsync).not.toHaveBeenCalled();
  });
});
