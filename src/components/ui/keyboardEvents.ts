import type { KeyboardEventName } from 'react-native';

/** Android and web: only the `did` events fire. */
export const KEYBOARD_SHOW: KeyboardEventName = 'keyboardDidShow';
export const KEYBOARD_HIDE: KeyboardEventName = 'keyboardDidHide';
