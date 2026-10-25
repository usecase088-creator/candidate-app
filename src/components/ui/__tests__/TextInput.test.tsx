import { createRef } from 'react';
import { StyleSheet } from 'react-native';

import { colors, fonts } from '@/theme/tokens';
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
});
