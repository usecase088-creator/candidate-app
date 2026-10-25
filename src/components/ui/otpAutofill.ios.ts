import type { TextInputProps } from 'react-native';

/** iOS suggests the code from Messages above the keyboard. */
export const otpAutofill: Pick<TextInputProps, 'textContentType' | 'autoComplete'> = {
  textContentType: 'oneTimeCode',
  autoComplete: 'one-time-code',
};
