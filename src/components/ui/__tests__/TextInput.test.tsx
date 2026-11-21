import { createRef } from 'react';
import { StyleSheet, Text } from 'react-native';

import { colors, fonts, radius } from '@/theme/tokens';
import { fireEvent, renderWithProviders, screen } from '@/test/render';

import { PasswordInput } from '../PasswordInput';
import { TextInput, type TextInputRef } from '../TextInput';

const flat = (s: unknown) => StyleSheet.flatten(s as never) ?? {};

describe('TextInput', () => {
  it('shows the label and names the input with it', async () => {
    await renderWithProviders(<TextInput testID="login.email" label="Email address" />);
    expect(screen.getByText('Email address')).toBeOnTheScreen();
    expect(screen.getByTestId('login.email').props.accessibilityLabel).toBe('Email address');
  });

  it('uses Inter and the foreground colour for typed text', async () => {
    await renderWithProviders(<TextInput testID="i" label="Email" />);
    expect(flat(screen.getByTestId('i').props.style)).toMatchObject({
      fontFamily: fonts.regular,
      color: colors.foreground,
    });
  });

  it('passes text changes through', async () => {
    const onChangeText = jest.fn();
    await renderWithProviders(<TextInput testID="i" label="Email" onChangeText={onChangeText} />);
    await fireEvent.changeText(screen.getByTestId('i'), 'a@b.com');
    expect(onChangeText).toHaveBeenCalledWith('a@b.com');
  });

  it('shows helper text when there is no error', async () => {
    await renderWithProviders(<TextInput testID="i" label="Mobile" helper="10-digit number" />);
    expect(screen.getByText('10-digit number')).toBeOnTheScreen();
  });

  it('shows the error instead of the helper, in the D15 red, announced to screen readers', async () => {
    await renderWithProviders(
      <TextInput
        testID="i"
        label="Email"
        helper="We never share it"
        error="Please enter a valid email address."
      />,
    );
    expect(screen.queryByText('We never share it')).toBeNull();
    const error = screen.getByTestId('i.error');
    expect(error).toHaveTextContent('Please enter a valid email address.');
    expect(flat(error.props.style).color).toBe(colors.errorText);
    expect(error.props.accessibilityLiveRegion).toBe('polite');
    expect(screen.getByTestId('i').props.accessibilityHint).toBe('Please enter a valid email address.');
  });

  it('turns the border red on error', async () => {
    await renderWithProviders(<TextInput testID="i" label="Email" error="Required" />);
    expect(flat(screen.getByTestId('i.field').props.style).borderColor).toBe(colors.destructive);
  });

  it('forwards the ref so forms can move focus to the next field', async () => {
    const ref = createRef<TextInputRef>();
    await renderWithProviders(<TextInput testID="i" label="Email" ref={ref} />);
    expect(typeof ref.current?.focus).toBe('function');
  });

  it('marks a disabled input as not editable', async () => {
    await renderWithProviders(<TextInput testID="i" label="Email" editable={false} />);
    expect(screen.getByTestId('i').props.editable).toBe(false);
  });
});

// D32: 48-pt field, radius 12, 15-pt text, placeholder token, 1-px border at rest, 1.5-px ring when focused,
// 1.5-px destructive + 13-pt message on error, muted fill when disabled (no opacity), `required`, `labelAccessory`.
describe('TextInput (D32)', () => {
  it('is a 48-pt field with radius 12, 15-pt text and the placeholder token', async () => {
    await renderWithProviders(<TextInput testID="i" label="Email" placeholder="you@example.com" />);
    expect(flat(screen.getByTestId('i.field').props.style)).toMatchObject({
      minHeight: 48,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
    });
    const input = screen.getByTestId('i');
    expect(flat(input.props.style).fontSize).toBe(15);
    expect(input).toHaveProp('placeholderTextColor', colors.placeholder);
  });

  it('has a 1-px border at rest and a 1.5-px ring while focused', async () => {
    await renderWithProviders(<TextInput testID="i" label="Email" />);
    const input = screen.getByTestId('i');
    expect(flat(screen.getByTestId('i.field').props.style)).toMatchObject({
      borderWidth: 1,
      borderColor: colors.border,
    });
    await fireEvent(input, 'focus');
    expect(flat(screen.getByTestId('i.field').props.style)).toMatchObject({
      borderWidth: 1.5,
      borderColor: colors.ring,
    });
    await fireEvent(input, 'blur');
    expect(flat(screen.getByTestId('i.field').props.style)).toMatchObject({
      borderWidth: 1,
      borderColor: colors.border,
    });
  });

  it('keeps calling the given onFocus and onBlur', async () => {
    const onFocus = jest.fn();
    const onBlur = jest.fn();
    await renderWithProviders(<TextInput testID="i" label="Email" onFocus={onFocus} onBlur={onBlur} />);
    await fireEvent(screen.getByTestId('i'), 'focus');
    await fireEvent(screen.getByTestId('i'), 'blur');
    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('error: 1.5-px destructive border even while focused, 13-pt message', async () => {
    await renderWithProviders(<TextInput testID="i" label="Email" error="Required" />);
    await fireEvent(screen.getByTestId('i'), 'focus');
    expect(flat(screen.getByTestId('i.field').props.style)).toMatchObject({
      borderWidth: 1.5,
      borderColor: colors.destructive,
    });
    expect(flat(screen.getByTestId('i.error').props.style)).toMatchObject({ fontSize: 13, lineHeight: 18 });
  });

  it('disabled: muted fill and mutedForeground text, no opacity', async () => {
    await renderWithProviders(<TextInput testID="i" label="Email" editable={false} />);
    const field = flat(screen.getByTestId('i.field').props.style);
    expect(field.backgroundColor).toBe(colors.muted);
    expect(field.opacity).toBeUndefined();
    expect(flat(screen.getByTestId('i').props.style).color).toBe(colors.mutedForeground);
  });

  it('required: shows a red asterisk after the label and says "required" to screen readers', async () => {
    await renderWithProviders(<TextInput testID="i" label="Email" required />);
    const asterisk = screen.getByTestId('i.required');
    expect(asterisk).toHaveTextContent('*');
    expect(flat(asterisk.props.style).color).toBe(colors.errorText);
    expect(screen.getByTestId('i').props.accessibilityLabel).toMatch(/required/);
  });

  it('is not marked required by default', async () => {
    await renderWithProviders(<TextInput testID="i" label="Email" />);
    expect(screen.queryByTestId('i.required')).toBeNull();
    expect(screen.getByTestId('i').props.accessibilityLabel).toBe('Email');
  });

  it('places a labelAccessory on the right of the label row', async () => {
    await renderWithProviders(
      <TextInput
        testID="i"
        label="Password"
        labelAccessory={<Text testID="i.forgot">Forgot password?</Text>}
      />,
    );
    expect(screen.getByTestId('i.forgot')).toBeOnTheScreen();
    expect(flat(screen.getByTestId('i.labelRow').props.style)).toMatchObject({
      flexDirection: 'row',
      justifyContent: 'space-between',
    });
  });

  it('multiline: at least 96 tall, text starts at the top', async () => {
    await renderWithProviders(<TextInput testID="i" label="Cover note" multiline />);
    expect(flat(screen.getByTestId('i.field').props.style).minHeight).toBe(96);
    expect(screen.getByTestId('i')).toHaveProp('textAlignVertical', 'top');
  });

  it('passes returnKeyType and onSubmitEditing through', async () => {
    const onSubmitEditing = jest.fn();
    await renderWithProviders(
      <TextInput testID="i" label="Email" returnKeyType="next" onSubmitEditing={onSubmitEditing} />,
    );
    const input = screen.getByTestId('i');
    expect(input).toHaveProp('returnKeyType', 'next');
    await fireEvent(input, 'submitEditing');
    expect(onSubmitEditing).toHaveBeenCalledTimes(1);
  });
});

describe('PasswordInput', () => {
  it('hides the password and offers to show it', async () => {
    await renderWithProviders(<PasswordInput testID="login.password" label="Password" />);
    expect(screen.getByTestId('login.password').props.secureTextEntry).toBe(true);
    expect(screen.getByRole('button', { name: 'Show password' })).toBeOnTheScreen();
  });

  it('toggles visibility', async () => {
    await renderWithProviders(<PasswordInput testID="login.password" label="Password" />);
    await fireEvent.press(screen.getByTestId('login.password.toggle'));
    expect(screen.getByTestId('login.password').props.secureTextEntry).toBe(false);
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeOnTheScreen();
  });

  it('turns off autocorrect and capitalisation, and helps password managers', async () => {
    await renderWithProviders(<PasswordInput testID="p" label="Password" />);
    const input = screen.getByTestId('p');
    expect(input.props).toMatchObject({
      autoCapitalize: 'none',
      autoCorrect: false,
      autoComplete: 'current-password',
      textContentType: 'password',
    });
  });

  it('asks for a new password on signup and reset', async () => {
    await renderWithProviders(<PasswordInput testID="p" label="Password" isNew />);
    expect(screen.getByTestId('p').props).toMatchObject({
      autoComplete: 'new-password',
      textContentType: 'newPassword',
    });
  });

  it('shows errors like TextInput', async () => {
    await renderWithProviders(<PasswordInput testID="p" label="Password" error="Password is required" />);
    expect(screen.getByTestId('p.error')).toHaveTextContent('Password is required');
  });

  // D32: the toggle is a 44-pt icon button (eye / eye.slash), not a "Show" text link.
  it('toggles with a 44-pt eye icon button instead of Show/Hide text', async () => {
    await renderWithProviders(<PasswordInput testID="p" label="Password" />);
    const toggle = screen.getByTestId('p.toggle');
    expect(flat(toggle.props.style)).toMatchObject({ width: 44, height: 44 });
    expect(screen.queryByText('Show')).toBeNull();
    const icon = screen.getByTestId('p.toggle.icon');
    // expo-symbols resolves `{ ios, android, web }` to the running platform's name (iOS under jest-expo).
    expect(icon).toHaveProp('name', 'eye');
    expect(flat(icon.props.style)).toMatchObject({ width: 20, height: 20 });
    await fireEvent.press(toggle);
    expect(screen.getByTestId('p.toggle.icon')).toHaveProp('name', 'eye.slash');
    expect(screen.queryByText('Hide')).toBeNull();
  });

  it('forwards required and labelAccessory to the field', async () => {
    await renderWithProviders(
      <PasswordInput
        testID="p"
        label="Password"
        required
        labelAccessory={<Text testID="p.forgot">Forgot password?</Text>}
      />,
    );
    expect(screen.getByTestId('p.required')).toBeOnTheScreen();
    expect(screen.getByTestId('p.forgot')).toBeOnTheScreen();
  });
});
