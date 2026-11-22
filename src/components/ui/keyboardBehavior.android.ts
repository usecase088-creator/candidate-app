import type { KeyboardAvoidingViewProps } from 'react-native';

/**
 * Android is edge-to-edge (SDK 58): the window does not reliably resize for the keyboard any more, and on the phone the
 * focused Password field stayed under it at large text. Pad like iOS: when the window does resize, the overlap the
 * KeyboardAvoidingView measures is 0 and the padding is 0, so this is safe both ways.
 */
export const keyboardBehavior: KeyboardAvoidingViewProps['behavior'] = 'padding';

/** Same sum as iOS: the view's frame starts below the native header, the keyboard's top is in window coordinates. */
export const keyboardOffset = (headerHeight: number): number => headerHeight;
