import type { TextInputProps } from 'react-native';

/** Android autofill offers the code from the SMS (Google SMS autofill / keyboard suggestion). */
export const otpAutofill: Pick<TextInputProps, 'textContentType' | 'autoComplete'> = {
  autoComplete: 'sms-otp',
};
