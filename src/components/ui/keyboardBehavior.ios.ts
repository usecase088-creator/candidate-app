import type { KeyboardAvoidingViewProps } from 'react-native';

/** iOS doesn't resize the window for the keyboard: pad the content instead. */
export const keyboardBehavior: KeyboardAvoidingViewProps['behavior'] = 'padding';

/** iOS: KeyboardAvoidingView measures its frame from below the native header: add the header height. */
export const keyboardOffset = (headerHeight: number): number => headerHeight;
