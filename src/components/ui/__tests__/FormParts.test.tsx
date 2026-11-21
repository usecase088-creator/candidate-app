import { AccessibilityInfo, StyleSheet } from 'react-native';

import { haptic } from '@/lib/haptics';
import { colors } from '@/theme/tokens';
import { fireEvent, renderWithProviders, screen } from '@/test/render';

import { Checkbox } from '../Checkbox';
import { FormErrorBox } from '../FormErrorBox';
import { LottieAnimation } from '../LottieAnimation';
import { TextButton } from '../TextButton';

jest.mock('@/lib/haptics', () => ({ haptic: jest.fn() }));

const flat = (s: unknown) => StyleSheet.flatten(s as never) ?? {};
const HIDDEN = { includeHiddenElements: true };

afterEach(() => jest.clearAllMocks());

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

  // D32: 22-pt box, radius 6, 1.5-px border; brand fill with an Icon check (no glyph text); 15-pt label.
  it('draws a 22-pt box with radius 6 and a 1.5-px border', async () => {
    await renderWithProviders(
      <Checkbox testID="c" checked={false} onChange={() => {}} accessibilityLabel="x">
        label
      </Checkbox>,
    );
    expect(flat(screen.getByTestId('c.box').props.style)).toMatchObject({
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: colors.border,
    });
    expect(screen.queryByTestId('c.check')).toBeNull();
    expect(flat(screen.getByTestId('c').props.style)).toMatchObject({ paddingVertical: 8 });
  });

  it('fills the box in brand with a white 14-pt Icon check when checked', async () => {
    await renderWithProviders(
      <Checkbox testID="c" checked onChange={() => {}} accessibilityLabel="x">
        label
      </Checkbox>,
    );
    expect(flat(screen.getByTestId('c.box').props.style)).toMatchObject({
      backgroundColor: colors.brand,
      borderColor: colors.brand,
    });
    const check = screen.getByTestId('c.check');
    expect(check).toHaveProp('tintColor', colors.surface);
    // expo-symbols resolves `{ ios, android, web }` to the running platform's name (iOS under jest-expo).
    expect(check).toHaveProp('name', 'checkmark');
    expect(flat(check.props.style)).toMatchObject({ width: 14, height: 14 });
    expect(screen.queryByText('✓')).toBeNull();
  });

  it('sets a string label in the body ramp (15/20)', async () => {
    await renderWithProviders(
      <Checkbox testID="c" checked={false} onChange={() => {}} accessibilityLabel="x">
        I agree
      </Checkbox>,
    );
    expect(flat(screen.getByText('I agree').props.style)).toMatchObject({ fontSize: 15, lineHeight: 20 });
  });

  it('fires a selection haptic without shrinking the row', async () => {
    await renderWithProviders(
      <Checkbox testID="c" checked={false} onChange={() => {}} accessibilityLabel="x">
        label
      </Checkbox>,
    );
    await fireEvent.press(screen.getByTestId('c'));
    expect(haptic).toHaveBeenCalledWith('selection');
  });

  it('outlines an invalid unchecked box in red', async () => {
    await renderWithProviders(
      <Checkbox testID="c" checked={false} onChange={() => {}} accessibilityLabel="x" invalid>
        label
      </Checkbox>,
    );
    expect(flat(screen.getByTestId('c.box').props.style).borderColor).toBe(colors.destructive);
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
  // D32: a compact link (14/500 brand, 8-pt vertical padding, hitSlop 12 reaches 44) instead of a 48-pt block.
  // The old "at least 48 tall" assertion encoded the pre-D32 layout; the touch target now comes from hitSlop.
  it('is a brand-coloured button with a testID whose touch target reaches 44 through hitSlop', async () => {
    const onPress = jest.fn();
    await renderWithProviders(
      <TextButton testID="login.forgot" label="Forgot password?" onPress={onPress} />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Forgot password?' }));
    expect(onPress).toHaveBeenCalled();
    const label = screen.getByText('Forgot password?');
    expect(flat(label.props.style)).toMatchObject({ color: colors.brand, fontSize: 14, lineHeight: 20 });
    const button = screen.getByTestId('login.forgot');
    const style = flat(button.props.style);
    expect(style).toMatchObject({ paddingVertical: 8, alignSelf: 'flex-start' });
    expect(style.minHeight).toBeUndefined();
    expect(button.props.hitSlop).toBe(12);
    expect(20 + 8 * 2 + 12 * 2).toBeGreaterThanOrEqual(44);
  });

  it('keeps the given colour and spoken label', async () => {
    await renderWithProviders(
      <TextButton
        testID="t"
        label="Edit"
        color="destructive"
        accessibilityLabel="Edit details"
        onPress={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: 'Edit details' })).toBeOnTheScreen();
    expect(flat(screen.getByText('Edit').props.style).color).toBe(colors.destructive);
  });

  it('fades to half when disabled and does not press', async () => {
    const onPress = jest.fn();
    await renderWithProviders(<TextButton testID="t" label="Resend" onPress={onPress} disabled />);
    const button = screen.getByTestId('t');
    expect(button).toBeDisabled();
    // Like Button: the fade sits on the label (the pressable's own opacity belongs to the press animation).
    expect(flat(screen.getByText('Resend').props.style).opacity).toBe(0.5);
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
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

describe('LottieAnimation on web (Playwright checks only)', () => {
  it('keeps the size and testID but plays nothing (no Lottie web player installed)', async () => {
    const { LottieAnimation: WebLottie } =
      jest.requireActual<typeof import('../LottieAnimation.web')>('../LottieAnimation.web');
    await renderWithProviders(<WebLottie testID="w" name="authSuccess" size={64} />);
    const box = screen.getByTestId('w', HIDDEN);
    expect(flat(box.props.style)).toMatchObject({ width: 64, height: 64 });
    expect(screen.queryByTestId('w.lottie', HIDDEN)).toBeNull();
  });
});
