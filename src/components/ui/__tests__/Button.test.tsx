import { StyleSheet } from 'react-native';

import { colors, fonts, MIN_TOUCH } from '@/theme/tokens';
import { fireEvent, renderWithProviders, screen } from '@/test/render';

import { Button } from '../Button';
import { AppText } from '../Text';

const flat = (s: unknown) => StyleSheet.flatten(s as never) ?? {};

describe('AppText', () => {
  it('uses Inter and the foreground colour by default', async () => {
    await renderWithProviders(<AppText testID="t">Hello</AppText>);
    expect(flat(screen.getByTestId('t').props.style)).toMatchObject({
      fontFamily: fonts.regular,
      color: colors.foreground,
      fontSize: 14,
    });
  });

  it('maps weight and colour tokens', async () => {
    await renderWithProviders(
      <AppText testID="t" weight="bold" color="mutedForeground" variant="caption">
        x
      </AppText>,
    );
    expect(flat(screen.getByTestId('t').props.style)).toMatchObject({
      fontFamily: fonts.bold,
      color: colors.mutedForeground,
      fontSize: 12,
    });
  });

  it('marks titles as headers for screen readers', async () => {
    await renderWithProviders(<AppText variant="title">Welcome back</AppText>);
    expect(screen.getByRole('header', { name: 'Welcome back' })).toBeOnTheScreen();
  });
});

describe('Button', () => {
  it('is a button with its label as the accessible name and a testID', async () => {
    await renderWithProviders(<Button testID="login.submit" label="Sign In" onPress={() => {}} />);
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeOnTheScreen();
    expect(screen.getByTestId('login.submit')).toBeOnTheScreen();
  });

  it('accepts a separate accessibilityLabel', async () => {
    await renderWithProviders(
      <Button testID="b" label="Go" accessibilityLabel="Go to opportunities" onPress={() => {}} />,
    );
    expect(screen.getByRole('button', { name: 'Go to opportunities' })).toBeOnTheScreen();
  });

  it('calls onPress', async () => {
    const onPress = jest.fn();
    await renderWithProviders(<Button testID="b" label="Go" onPress={onPress} />);
    await fireEvent.press(screen.getByTestId('b'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('ignores presses and says so when disabled', async () => {
    const onPress = jest.fn();
    await renderWithProviders(<Button testID="b" label="Go" disabled onPress={onPress} />);
    await fireEvent.press(screen.getByTestId('b'));
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByTestId('b')).toBeDisabled();
  });

  it('shows a spinner, stays named and ignores presses while loading', async () => {
    const onPress = jest.fn();
    await renderWithProviders(<Button testID="b" label="Sign In" loading onPress={onPress} />);
    await fireEvent.press(screen.getByTestId('b'));
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByTestId('b.spinner')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeBusy();
  });

  it('is at least 48 tall and never fixes its height (font scale 2)', async () => {
    await renderWithProviders(<Button testID="b" label="Go" onPress={() => {}} />);
    const style = flat(screen.getByTestId('b').props.style);
    expect(style.minHeight).toBeGreaterThanOrEqual(MIN_TOUCH);
    expect(style.height).toBeUndefined();
  });

  it.each([
    ['primary', colors.primary],
    ['brand', colors.brand],
    ['destructive', colors.destructive],
  ] as const)('%s variant uses its background token', async (variant, bg) => {
    await renderWithProviders(<Button testID="b" label="Go" variant={variant} onPress={() => {}} />);
    expect(flat(screen.getByTestId('b').props.style).backgroundColor).toBe(bg);
  });

  it('outline variant has a border and no fill', async () => {
    await renderWithProviders(<Button testID="b" label="Go" variant="outline" onPress={() => {}} />);
    expect(flat(screen.getByTestId('b').props.style)).toMatchObject({
      borderColor: colors.border,
      backgroundColor: colors.surface,
    });
  });

  it('gradient variant draws the signup gradient (D16)', async () => {
    await renderWithProviders(
      <Button testID="b" label="Create Account" variant="gradient" onPress={() => {}} />,
    );
    expect(screen.getByTestId('b.gradient')).toBeOnTheScreen();
  });
});
