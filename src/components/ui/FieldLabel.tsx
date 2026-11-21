import type { StyleProp, TextStyle } from 'react-native';

import { AppText } from './Text';

export type FieldLabelProps = {
  /** The field's testID: the asterisk is `{testID}.required`. */
  testID?: string;
  label: string;
  required?: boolean;
  nativeID?: string;
  style?: StyleProp<TextStyle>;
};

/**
 * R2: the one field label (14/500) and the one required marker, a red `errorText` asterisk as its own text, so the
 * label reads the same everywhere (TextInput, DateField, the builder's choice groups).
 */
export function FieldLabel({ testID, label, required, nativeID, style }: FieldLabelProps) {
  return (
    <AppText variant="label" nativeID={nativeID} style={style}>
      {label}
      {required ? (
        <AppText testID={testID ? `${testID}.required` : undefined} variant="label" color="errorText">
          {' *'}
        </AppText>
      ) : null}
    </AppText>
  );
}
