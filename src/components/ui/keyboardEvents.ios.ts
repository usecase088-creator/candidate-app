import type { KeyboardEventName } from 'react-native';

/** iOS: the `will` events fire before the keyboard animates, so a bar hides without a visible lag. */
export const KEYBOARD_SHOW: KeyboardEventName = 'keyboardWillShow';
export const KEYBOARD_HIDE: KeyboardEventName = 'keyboardWillHide';
