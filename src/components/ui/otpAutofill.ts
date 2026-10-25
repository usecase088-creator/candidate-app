import type { TextInputProps } from 'react-native';

/** Web (Playwright checks only): the standard one-time-code autocomplete hint. */
export const otpAutofill: Pick<TextInputProps, 'textContentType' | 'autoComplete'> = {
  autoComplete: 'one-time-code',
};
