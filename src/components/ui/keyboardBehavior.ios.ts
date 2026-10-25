import type { KeyboardAvoidingViewProps } from 'react-native';

/** iOS doesn't resize the window for the keyboard: pad the content instead. */
export const keyboardBehavior: KeyboardAvoidingViewProps['behavior'] = 'padding';
