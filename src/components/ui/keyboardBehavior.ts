import type { KeyboardAvoidingViewProps } from 'react-native';

/** Web (Playwright checks only): the browser handles the on-screen keyboard. */
export const keyboardBehavior: KeyboardAvoidingViewProps['behavior'] = undefined;

/** Web: no offset. */
export const keyboardOffset = (_headerHeight: number): number => 0;
