import { act } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '@/theme/tokens';
import { fireEvent, render, renderWithProviders, screen } from '@/test/render';

import { type ToastVariant, useToast } from '../Toast';

const flat = (s: unknown) => StyleSheet.flatten(s as never) ?? {};

function Trigger({
  message,
  variant,
  duration,
}: {
  message: string;
  variant?: ToastVariant;
  duration?: number;
}) {
  const toast = useToast();
  return (
    <Pressable testID="trigger" onPress={() => toast.show(message, { variant, duration })}>
      <Text>show</Text>
    </Pressable>
  );
}

beforeEach(() => jest.useFakeTimers());
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
  await act(async () => {
    jest.advanceTimersByTime(3999);
  });
  expect(screen.getByTestId('toast')).toBeOnTheScreen();
  await act(async () => {
    jest.advanceTimersByTime(1);
  });
  expect(screen.queryByTestId('toast')).toBeNull();
});

it('respects a custom duration (e.g. the 30 s warm-up message)', async () => {
  await renderWithProviders(<Trigger message="Server is warming up..." duration={30_000} />);
  await fireEvent.press(screen.getByTestId('trigger'));
  await act(async () => {
    jest.advanceTimersByTime(29_000);
  });
  expect(screen.getByTestId('toast')).toBeOnTheScreen();
});

it('a new toast replaces the current one and restarts the timer', async () => {
  function Two() {
    const toast = useToast();
    return (
      <>
        <Pressable testID="a" onPress={() => toast.show('first')} />
        <Pressable testID="b" onPress={() => toast.show('second')} />
      </>
    );
  }
  await renderWithProviders(<Two />);
  await fireEvent.press(screen.getByTestId('a'));
  await act(async () => {
    jest.advanceTimersByTime(3000);
  });
  await fireEvent.press(screen.getByTestId('b'));
  expect(screen.getByTestId('toast')).toHaveTextContent('second');
  await act(async () => {
    jest.advanceTimersByTime(3000);
  });
  expect(screen.getByTestId('toast')).toHaveTextContent('second');
});

it('can be dismissed by tapping it', async () => {
  await renderWithProviders(<Trigger message="Saved" />);
  await fireEvent.press(screen.getByTestId('trigger'));
  await fireEvent.press(screen.getByTestId('toast'));
  expect(screen.queryByTestId('toast')).toBeNull();
});

it('error toasts use the destructive accent and D15 error text', async () => {
  await renderWithProviders(<Trigger message="Invalid OTP." variant="error" />);
  await fireEvent.press(screen.getByTestId('trigger'));
  expect(flat(screen.getByTestId('toast').props.style).borderLeftColor).toBe(colors.destructive);
  expect(flat(screen.getByText('Invalid OTP.').props.style).color).toBe(colors.errorText);
});

it('explains a missing provider', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  await expect(render(<Trigger message="x" />)).rejects.toThrow(/ToastProvider/);
});
