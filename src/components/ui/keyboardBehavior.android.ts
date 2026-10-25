import type { KeyboardAvoidingViewProps } from 'react-native';

/** Android resizes the window for the keyboard (edge-to-edge, adjustResize): nothing extra to do. */
export const keyboardBehavior: KeyboardAvoidingViewProps['behavior'] = undefined;
