import { StyleSheet, Text } from 'react-native';

import { haptic } from '@/lib/haptics';
import { motion } from '@/theme/tokens';
import { fireEvent, renderWithProviders, screen } from '@/test/render';

import { PressableScale } from '../PressableScale';
import { pressableRipple as androidRipple } from '../pressableRipple.android';
import { pressableRipple as iosRipple } from '../pressableRipple.ios';

jest.mock('@/lib/haptics', () => ({ haptic: jest.fn() }));

const flat = (s: unknown) => StyleSheet.flatten(s as never) ?? {};
afterEach(() => {
  jest.clearAllMocks();
});

// D32: "nothing acknowledges the touch" is the first cheap signal. Every row, card, chip and icon button goes through
// this wrapper: scale + opacity on iOS, ripple on Android, haptic by meaning, Reduce Motion honoured.
describe('PressableScale', () => {
  it('is a button that calls onPress and carries its testID and label', async () => {
    const onPress = jest.fn();
    await renderWithProviders(
      <PressableScale testID="row" accessibilityLabel="Open Staff Nurse" onPress={onPress}>
        <Text>Staff Nurse</Text>
      </PressableScale>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Open Staff Nurse' }));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('row')).toBeOnTheScreen();
  });

  it('fires the requested haptic on press, and none by default', async () => {
    const onPress = jest.fn();
    await renderWithProviders(
      <>
        <PressableScale testID="a" haptic="light" onPress={onPress}>
          <Text>a</Text>
        </PressableScale>
        <PressableScale testID="b" onPress={onPress}>
          <Text>b</Text>
        </PressableScale>
      </>,
    );
    await fireEvent.press(screen.getByTestId('a'));
    expect(haptic).toHaveBeenCalledWith('light');
    await fireEvent.press(screen.getByTestId('b'));
    expect(haptic).toHaveBeenCalledTimes(1);
  });

  it('does nothing when disabled (no press, no haptic) and says so', async () => {
    const onPress = jest.fn();
    await renderWithProviders(
      <PressableScale testID="a" haptic="medium" disabled onPress={onPress}>
        <Text>a</Text>
      </PressableScale>,
    );
    await fireEvent.press(screen.getByTestId('a'));
    expect(onPress).not.toHaveBeenCalled();
    expect(haptic).not.toHaveBeenCalled();
    expect(screen.getByTestId('a')).toBeDisabled();
  });

  it('shrinks and dims while pressed, and springs back (iOS)', async () => {
    jest.useFakeTimers();
    try {
      await renderWithProviders(
        <PressableScale testID="a" onPress={() => {}}>
          <Text>a</Text>
        </PressableScale>,
      );
      const el = screen.getByTestId('a');
      await fireEvent(el, 'pressIn');
      jest.advanceTimersByTime(2000);
      expect(el).toHaveAnimatedStyle({
        transform: [{ scale: motion.pressScale }],
        opacity: motion.pressOpacity,
      });
      await fireEvent(el, 'pressOut');
      jest.advanceTimersByTime(2000);
      expect(el).toHaveAnimatedStyle({ transform: [{ scale: 1 }], opacity: 1 });
    } finally {
      jest.useRealTimers();
    }
  });

  it('uses a ripple on Android only', () => {
    expect(androidRipple).toEqual({ color: motion.ripple, foreground: true });
    expect(iosRipple).toBeUndefined();
  });

  it('keeps "disabled" when the caller passes its own accessibilityState', async () => {
    await renderWithProviders(
      <PressableScale testID="a" disabled accessibilityState={{ selected: true }} onPress={() => {}}>
        <Text>a</Text>
      </PressableScale>,
    );
    expect(screen.getByTestId('a').props.accessibilityState).toEqual({ selected: true, disabled: true });
  });

  it('keeps the caller style (radius, padding) on the pressable itself so the ripple is clipped to the shape', async () => {
    await renderWithProviders(
      <PressableScale testID="a" style={{ borderRadius: 12, padding: 8 }} onPress={() => {}}>
        <Text>a</Text>
      </PressableScale>,
    );
    expect(flat(screen.getByTestId('a').props.style)).toMatchObject({ borderRadius: 12, padding: 8 });
  });
});
