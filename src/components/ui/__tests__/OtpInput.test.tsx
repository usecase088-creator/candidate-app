import { StyleSheet } from 'react-native';

import { colors } from '@/theme/tokens';
import { fireEvent, renderWithProviders, screen } from '@/test/render';

import { OtpInput } from '../OtpInput';
import { otpAutofill as androidAutofill } from '../otpAutofill.android';
import { otpAutofill as iosAutofill } from '../otpAutofill.ios';

// Boxes are hidden from screen readers on purpose; query them anyway.
const HIDDEN = { includeHiddenElements: true };
const flat = (s: unknown) => StyleSheet.flatten(s as never) ?? {};

function setup(props: Partial<Parameters<typeof OtpInput>[0]> = {}) {
  const onChangeText = jest.fn();
  const onComplete = jest.fn();
  return {
    onChangeText,
    onComplete,
    render: () =>
      renderWithProviders(
        <OtpInput
          testID="signup.otp"
          label="Mobile OTP"
          value=""
          onChangeText={onChangeText}
          onComplete={onComplete}
          {...props}
        />,
      ),
  };
}

it('shows the website label and names the field with it', async () => {
  await setup().render();
  expect(screen.getByText('Mobile OTP')).toBeOnTheScreen();
  expect(screen.getByTestId('signup.otp').props.accessibilityLabel).toBe('Mobile OTP');
});

it('opens the number pad and accepts at most 6 characters', async () => {
  await setup().render();
  expect(screen.getByTestId('signup.otp').props).toMatchObject({ keyboardType: 'number-pad', maxLength: 6 });
});

it('keeps digits only, as the website does', async () => {
  const s = setup();
  await s.render();
  await fireEvent.changeText(screen.getByTestId('signup.otp'), '12a3');
  expect(s.onChangeText).toHaveBeenLastCalledWith('123');
});

it('handles a pasted code with spaces and extra digits', async () => {
  const s = setup();
  await s.render();
  await fireEvent.changeText(screen.getByTestId('signup.otp'), '123 456 789');
  expect(s.onChangeText).toHaveBeenLastCalledWith('123456');
  expect(s.onComplete).toHaveBeenCalledWith('123456');
});

it('calls onComplete only when all 6 digits are there', async () => {
  const s = setup();
  await s.render();
  await fireEvent.changeText(screen.getByTestId('signup.otp'), '12345');
  expect(s.onComplete).not.toHaveBeenCalled();
});

it('draws one box per digit', async () => {
  await setup({ value: '12' }).render();
  expect(screen.getByTestId('signup.otp.box.0', HIDDEN)).toHaveTextContent('1');
  expect(screen.getByTestId('signup.otp.box.1', HIDDEN)).toHaveTextContent('2');
  expect(screen.getByTestId('signup.otp.box.2', HIDDEN)).toHaveTextContent('');
  expect(screen.queryByTestId('signup.otp.box.6', HIDDEN)).toBeNull();
});

it('highlights the next empty box', async () => {
  await setup({ value: '12' }).render();
  expect(flat(screen.getByTestId('signup.otp.box.2', HIDDEN).props.style).borderColor).toBe(colors.ring);
  expect(flat(screen.getByTestId('signup.otp.box.3', HIDDEN).props.style).borderColor).toBe(colors.input);
});

it('shows an error in the D15 red and red boxes', async () => {
  await setup({ value: '12', error: 'Please enter a valid 6-digit OTP.' }).render();
  const error = screen.getByTestId('signup.otp.error');
  expect(error).toHaveTextContent('Please enter a valid 6-digit OTP.');
  expect(flat(error.props.style).color).toBe(colors.errorText);
  expect(flat(screen.getByTestId('signup.otp.box.0', HIDDEN).props.style).borderColor).toBe(
    colors.destructive,
  );
});

it('hides the boxes from screen readers (the input carries the value)', async () => {
  await setup({ value: '12' }).render();
  expect(screen.getByTestId('signup.otp.boxes', HIDDEN).props.importantForAccessibility).toBe(
    'no-hide-descendants',
  );
});

describe('SMS autofill hints', () => {
  it('iOS offers the code from Messages', () => {
    expect(iosAutofill).toEqual({ textContentType: 'oneTimeCode', autoComplete: 'one-time-code' });
  });

  it('Android uses the SMS OTP autofill hint', () => {
    expect(androidAutofill).toEqual({ autoComplete: 'sms-otp' });
  });

  it('the input gets the hints of the current platform', async () => {
    await setup().render();
    expect(screen.getByTestId('signup.otp').props).toMatchObject(iosAutofill);
  });
});

it('keeps the real input fully invisible, so typed digits never show through the boxes (seen on Android)', async () => {
  await setup({ value: '12' }).render();
  expect(flat(screen.getByTestId('signup.otp').props.style).opacity).toBe(0);
});
