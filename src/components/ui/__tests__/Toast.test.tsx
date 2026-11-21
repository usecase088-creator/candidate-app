import { act } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { haptic } from '@/lib/haptics';
import { colors, motion, radius, shadows } from '@/theme/tokens';
import { fireEvent, render, renderWithProviders, screen } from '@/test/render';

import { type ToastPlacement, type ToastVariant, useToast } from '../Toast';

jest.mock('@/lib/haptics', () => ({ haptic: jest.fn() }));

let mockReduceMotion = false;
jest.mock('react-native-reanimated', () => ({
  __esModule: true, // the spread drops the flag; without it `import Animated from` gets the whole module
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: () => mockReduceMotion,
}));

const flat = (s: unknown) => StyleSheet.flatten(s as never) ?? {};

function Trigger({
  message,
  variant,
  duration,
  placement,
  offset,
}: {
  message: string;
  variant?: ToastVariant;
  duration?: number;
  placement?: ToastPlacement;
  offset?: number;
}) {
  const toast = useToast();
  return (
    <Pressable testID="trigger" onPress={() => toast.show(message, { variant, duration, placement, offset })}>
      <Text>show</Text>
    </Pressable>
  );
}

function Two() {
  const toast = useToast();
  return (
    <>
      <Pressable testID="a" onPress={() => toast.show('first')} />
      <Pressable testID="b" onPress={() => toast.show('second')} />
    </>
  );
}

/** Lets a running Reanimated animation (or the auto-hide timer) finish. */
const advance = async (ms: number) => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
};

beforeEach(() => {
  jest.useFakeTimers();
  mockReduceMotion = false;
  jest.mocked(haptic).mockClear();
});
afterEach(() => jest.useRealTimers());

it('shows a message, announced politely to screen readers', async () => {
  await renderWithProviders(<Trigger message="OTP sent to your mobile number." />);
  await fireEvent.press(screen.getByTestId('trigger'));
  const toast = screen.getByTestId('toast');
  expect(toast).toHaveTextContent('OTP sent to your mobile number.');
  expect(toast.props.accessibilityLiveRegion).toBe('polite');
  // Found on the phone: without a label, Android exposes the toast with no text (Maestro and some readers miss it).
  expect(toast.props.accessibilityLabel).toBe('OTP sent to your mobile number.');
  expect(screen.getByRole('alert')).toBeOnTheScreen();
});

it('hides itself after 4 seconds by default', async () => {
  await renderWithProviders(<Trigger message="Saved" />);
  await fireEvent.press(screen.getByTestId('trigger'));
  await advance(3999);
  expect(screen.getByTestId('toast')).toBeOnTheScreen();
  // D32: the toast slides out over motion.duration.exit before it leaves the tree (was: gone at 4000 ms exactly).
  await advance(1 + motion.duration.exit);
  expect(screen.queryByTestId('toast')).toBeNull();
});

it('respects a custom duration (e.g. the 30 s warm-up message)', async () => {
  await renderWithProviders(<Trigger message="Server is warming up..." duration={30_000} />);
  await fireEvent.press(screen.getByTestId('trigger'));
  await advance(29_000);
  expect(screen.getByTestId('toast')).toBeOnTheScreen();
});

it('a new toast replaces the current one and restarts the timer', async () => {
  await renderWithProviders(<Two />);
  await fireEvent.press(screen.getByTestId('a'));
  await advance(3000);
  await fireEvent.press(screen.getByTestId('b'));
  expect(screen.getByTestId('toast')).toHaveTextContent('second');
  await advance(3000);
  expect(screen.getByTestId('toast')).toHaveTextContent('second');
  expect(screen.getAllByRole('alert')).toHaveLength(1);
});

it('a toast shown while the previous one slides out stays up for its own duration', async () => {
  await renderWithProviders(<Two />);
  await fireEvent.press(screen.getByTestId('a'));
  await advance(4000 + 50); // "first" is on its way out
  await fireEvent.press(screen.getByTestId('b'));
  await advance(motion.duration.exit); // the old exit finishing must not remove the new toast
  expect(screen.getByTestId('toast')).toHaveTextContent('second');
  await advance(4000 - motion.duration.exit - 1);
  expect(screen.getByTestId('toast')).toHaveTextContent('second');
});

it('can be dismissed by tapping it', async () => {
  await renderWithProviders(<Trigger message="Saved" />);
  await fireEvent.press(screen.getByTestId('trigger'));
  await fireEvent.press(screen.getByTestId('toast'));
  // D32: leaves after the exit animation, not synchronously.
  await advance(motion.duration.exit);
  expect(screen.queryByTestId('toast')).toBeNull();
});

describe('D32 look', () => {
  it('error: destructiveSoft fill, errorText icon, body text in foreground (never coloured body text)', async () => {
    // Was: white card with a destructive left bar and errorText message (pre-D32).
    await renderWithProviders(<Trigger message="Invalid OTP." variant="error" />);
    await fireEvent.press(screen.getByTestId('trigger'));
    const toast = screen.getByTestId('toast');
    expect(flat(toast.props.style)).toMatchObject({
      backgroundColor: colors.destructiveSoft,
      borderRadius: radius.md,
      paddingVertical: 12,
      paddingHorizontal: 16,
      boxShadow: shadows.soft,
    });
    expect(flat(toast.props.style).borderLeftWidth).toBeUndefined();
    const icon = screen.getByTestId('toast.icon');
    expect(icon).toHaveProp('tintColor', colors.errorText);
    // jest-expo runs as iOS, so Icon receives the resolved SF Symbol name.
    expect(icon).toHaveProp('name', 'exclamationmark.circle.fill');
    expect(flat(icon.props.style)).toMatchObject({ width: 20, height: 20 });
    const text = screen.getByText('Invalid OTP.');
    expect(flat(text.props.style)).toMatchObject({ color: colors.foreground, fontSize: 15 });
    expect(text).toHaveProp('numberOfLines', 2);
  });

  it('success: successSoft fill and a successText check icon', async () => {
    await renderWithProviders(<Trigger message="Job saved" variant="success" />);
    await fireEvent.press(screen.getByTestId('trigger'));
    expect(flat(screen.getByTestId('toast').props.style).backgroundColor).toBe(colors.successSoft);
    const icon = screen.getByTestId('toast.icon');
    expect(icon).toHaveProp('tintColor', colors.successText);
    expect(icon).toHaveProp('name', 'checkmark.circle.fill');
  });

  it('info (default): skySoft fill and a skyText info icon', async () => {
    await renderWithProviders(<Trigger message="Signed in" />);
    await fireEvent.press(screen.getByTestId('trigger'));
    expect(flat(screen.getByTestId('toast').props.style).backgroundColor).toBe(colors.skySoft);
    const icon = screen.getByTestId('toast.icon');
    expect(icon).toHaveProp('tintColor', colors.skyText);
    expect(icon).toHaveProp('name', 'info.circle.fill');
  });
});

describe('haptics (D32: notification success / error on outcomes)', () => {
  it.each([
    ['success', 'success'],
    ['error', 'error'],
  ] as const)('%s toast fires haptic(%s)', async (variant, kind) => {
    await renderWithProviders(<Trigger message="x" variant={variant} />);
    await fireEvent.press(screen.getByTestId('trigger'));
    expect(haptic).toHaveBeenCalledTimes(1);
    expect(haptic).toHaveBeenCalledWith(kind);
  });

  it('info toasts are silent', async () => {
    await renderWithProviders(<Trigger message="x" />);
    await fireEvent.press(screen.getByTestId('trigger'));
    expect(haptic).not.toHaveBeenCalled();
  });
});

describe('placement', () => {
  it('sits above the tab bar by default: bottom inset + 72', async () => {
    await renderWithProviders(<Trigger message="x" />);
    await fireEvent.press(screen.getByTestId('trigger'));
    const host = flat(screen.getByTestId('toast.host').props.style);
    expect(host.bottom).toBe(72);
    expect(host.top).toBeUndefined();
  });

  it('can sit under the header of a pushed screen: top inset + offset', async () => {
    await renderWithProviders(<Trigger message="x" placement="top" offset={56} />);
    await fireEvent.press(screen.getByTestId('trigger'));
    const host = flat(screen.getByTestId('toast.host').props.style);
    expect(host.top).toBe(56);
    expect(host.bottom).toBeUndefined();
  });

  it('offset adds to the default bottom placement', async () => {
    await renderWithProviders(<Trigger message="x" offset={48} />);
    await fireEvent.press(screen.getByTestId('trigger'));
    expect(flat(screen.getByTestId('toast.host').props.style).bottom).toBe(72 + 48);
  });
});

describe('motion (D32: enter 220 ease-out, exit 180, transform + opacity only)', () => {
  it('slides up and fades in, then slides down and fades out', async () => {
    await renderWithProviders(<Trigger message="x" />);
    await fireEvent.press(screen.getByTestId('trigger'));
    const toast = screen.getByTestId('toast');
    await advance(0); // Reanimated's jest mock writes the start pose on the first frame
    expect(toast).toHaveAnimatedStyle({ opacity: 0, transform: [{ translateY: 16 }] });
    await advance(motion.duration.enter);
    expect(toast).toHaveAnimatedStyle({ opacity: 1, transform: [{ translateY: 0 }] });
    await advance(4000 - motion.duration.enter);
    await advance(motion.duration.exit - 1);
    expect(screen.getByTestId('toast')).toBeOnTheScreen();
    await advance(1);
    expect(screen.queryByTestId('toast')).toBeNull();
  });

  it('a top toast slides down from above', async () => {
    await renderWithProviders(<Trigger message="x" placement="top" />);
    await fireEvent.press(screen.getByTestId('trigger'));
    await advance(0);
    expect(screen.getByTestId('toast')).toHaveAnimatedStyle({ opacity: 0, transform: [{ translateY: -16 }] });
  });

  it('Reduce Motion: fade only, no translation', async () => {
    mockReduceMotion = true;
    await renderWithProviders(<Trigger message="x" />);
    await fireEvent.press(screen.getByTestId('trigger'));
    const toast = screen.getByTestId('toast');
    await advance(0);
    expect(toast).toHaveAnimatedStyle({ opacity: 0, transform: [{ translateY: 0 }] });
    await advance(motion.duration.enter);
    expect(toast).toHaveAnimatedStyle({ opacity: 1, transform: [{ translateY: 0 }] });
  });
});

it('explains a missing provider', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  await expect(render(<Trigger message="x" />)).rejects.toThrow(/ToastProvider/);
});
