import { AccessibilityInfo, StyleSheet } from 'react-native';

import { colors, radius } from '@/theme/tokens';
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

// D32: fire once per completed code, so a screen that submits on complete never double-submits (a 7th key press
// or a repeated autofill event hands the same 6 digits back).
it('calls onComplete once per completed code, not again for the same digits', async () => {
  const s = setup();
  await s.render();
  const input = screen.getByTestId('signup.otp');
  await fireEvent.changeText(input, '123456');
  await fireEvent.changeText(input, '1234567');
  expect(s.onComplete).toHaveBeenCalledTimes(1);
  await fireEvent.changeText(input, '12345');
  await fireEvent.changeText(input, '123457');
  expect(s.onComplete).toHaveBeenCalledTimes(2);
  expect(s.onComplete).toHaveBeenLastCalledWith('123457');
});

describe('boxes (D32)', () => {
  it('are 52 tall with radius 12 and white when empty', async () => {
    await setup({ value: '' }).render();
    expect(flat(screen.getByTestId('signup.otp.box.1', HIDDEN).props.style)).toMatchObject({
      minHeight: 52,
      borderRadius: radius.md,
      borderWidth: 1,
      backgroundColor: colors.surface,
    });
  });

  it('fill with surface2 once they hold a digit, and show it at 22/600 tabular', async () => {
    await setup({ value: '12' }).render();
    expect(flat(screen.getByTestId('signup.otp.box.0', HIDDEN).props.style).backgroundColor).toBe(
      colors.surface2,
    );
    expect(flat(screen.getByTestId('signup.otp.box.2', HIDDEN).props.style).backgroundColor).toBe(
      colors.surface,
    );
    expect(flat(screen.getByText('1', HIDDEN).props.style)).toMatchObject({
      fontSize: 22,
      fontFamily: 'Inter_600SemiBold',
      fontVariant: ['tabular-nums'],
    });
  });

  it('draw the active box with a 1.5-px ring', async () => {
    await setup({ value: '12' }).render();
    expect(flat(screen.getByTestId('signup.otp.box.2', HIDDEN).props.style)).toMatchObject({
      borderWidth: 1.5,
      borderColor: colors.ring,
    });
    expect(flat(screen.getByTestId('signup.otp.box.3', HIDDEN).props.style).borderWidth).toBe(1);
  });
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
  // R3 a11y P2-5: empty boxes are outlined at 3:1.
  expect(flat(screen.getByTestId('signup.otp.box.3', HIDDEN).props.style).borderColor).toBe(
    colors.controlBorder,
  );
});

it('R3 a11y P3-3: required shows the red marker and is spoken as "required" (not "star")', async () => {
  await renderWithProviders(
    <OtpInput testID="signup.otp" label="Mobile OTP" required value="" onChangeText={() => {}} />,
  );
  expect(screen.getByTestId('signup.otp.required')).toHaveTextContent('*');
  expect(screen.getByTestId('signup.otp').props.accessibilityLabel).toBe('Mobile OTP, required');
});

it('R3 a11y P1-1: a new error is spoken', async () => {
  const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
  announce.mockClear();
  await renderWithProviders(
    <OtpInput testID="signup.otp" label="Mobile OTP" value="" error="Invalid OTP." onChangeText={() => {}} />,
  );
  expect(announce).toHaveBeenCalledWith('Invalid OTP.');
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

describe('hiding the real input (found on the phone)', () => {
  // opacity 0.02 let digits show through on Android; opacity 0 removed the input from Android's accessibility
  // tree (TalkBack and Maestro could not reach it). The input stays opaque, under the boxes, in the box colour.
  it('keeps the input opaque so screen readers can reach it', async () => {
    await setup({ value: '12' }).render();
    const style = flat(screen.getByTestId('signup.otp').props.style);
    expect(style.opacity ?? 1).toBe(1);
    expect(style.color).toBe(colors.surface);
  });

  it('draws the boxes over the input and lets touches through to it', async () => {
    await setup({ value: '12' }).render();
    const boxes = screen.getByTestId('signup.otp.boxes', HIDDEN);
    expect(boxes.props.pointerEvents).toBe('none');
    const order = JSON.stringify(screen.toJSON());
    expect(order.indexOf('"testID":"signup.otp"')).toBeLessThan(order.indexOf('"testID":"signup.otp.boxes"'));
  });
});
