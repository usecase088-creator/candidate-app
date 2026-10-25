import { AccessibilityInfo, StyleSheet } from 'react-native';

import { colors } from '@/theme/tokens';
import { fireEvent, renderWithProviders, screen } from '@/test/render';

import { Checkbox } from '../Checkbox';
import { FormErrorBox } from '../FormErrorBox';
import { LottieAnimation } from '../LottieAnimation';
import { TextButton } from '../TextButton';

const flat = (s: unknown) => StyleSheet.flatten(s as never) ?? {};
const HIDDEN = { includeHiddenElements: true };

describe('Checkbox', () => {
  it('is a checkbox with its label as name and state', async () => {
    await renderWithProviders(
      <Checkbox testID="signup.terms" checked={false} onChange={() => {}} accessibilityLabel="Accept terms">
        I agree
      </Checkbox>,
    );
    const box = screen.getByRole('checkbox', { name: 'Accept terms' });
    expect(box).not.toBeChecked();
    expect(screen.getByTestId('signup.terms')).toBe(box);
  });

  it('toggles', async () => {
    const onChange = jest.fn();
    await renderWithProviders(
      <Checkbox testID="c" checked={false} onChange={onChange} accessibilityLabel="x">
        label
      </Checkbox>,
    );
    await fireEvent.press(screen.getByTestId('c'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('shows the checked state', async () => {
    await renderWithProviders(
      <Checkbox testID="c" checked onChange={() => {}} accessibilityLabel="x">
        label
      </Checkbox>,
    );
    expect(screen.getByRole('checkbox')).toBeChecked();
  });
});

describe('FormErrorBox', () => {
  it('shows the message as an alert in the D15 red', async () => {
    await renderWithProviders(<FormErrorBox testID="login.error" message="Enter a valid email" />);
    const box = screen.getByTestId('login.error');
    expect(box).toHaveTextContent('Enter a valid email');
    expect(screen.getByRole('alert')).toBeOnTheScreen();
    expect(box.props.accessibilityLabel).toBe('Enter a valid email');
    expect(flat(screen.getByText('Enter a valid email').props.style).color).toBe(colors.errorText);
  });

  it('renders nothing without a message', async () => {
    await renderWithProviders(<FormErrorBox testID="login.error" message={undefined} />);
    expect(screen.queryByTestId('login.error')).toBeNull();
  });
});

describe('TextButton', () => {
  it('is a brand-coloured button with a testID, at least 48 tall', async () => {
    const onPress = jest.fn();
    await renderWithProviders(
      <TextButton testID="login.forgot" label="Forgot password?" onPress={onPress} />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Forgot password?' }));
    expect(onPress).toHaveBeenCalled();
    expect(flat(screen.getByText('Forgot password?').props.style).color).toBe(colors.brand);
    expect(flat(screen.getByTestId('login.forgot').props.style).minHeight).toBeGreaterThanOrEqual(44);
  });
});

describe('LottieAnimation (D19)', () => {
  it('plays a website animation once, hidden from screen readers', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    await renderWithProviders(<LottieAnimation testID="login.success" name="authSuccess" size={64} />);
    const view = await screen.findByTestId('login.success.lottie', HIDDEN);
    expect(view.props).toMatchObject({ autoPlay: true, loop: false });
    expect(flat(view.props.style)).toMatchObject({ width: 64, height: 64 });
    expect(screen.getByTestId('login.success', HIDDEN).props.importantForAccessibility).toBe(
      'no-hide-descendants',
    );
  });

  it('does not play with Reduce Motion on, like the website', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    await renderWithProviders(<LottieAnimation testID="a" name="mailSent" size={110} loop />);
    const view = await screen.findByTestId('a.lottie', HIDDEN);
    expect(view.props).toMatchObject({ autoPlay: false, loop: false });
  });
});
