import { type ComponentRef, type ReactNode, type Ref, useState } from 'react';
import {
  TextInput as RNTextInput,
  type TextInputProps as RNTextInputProps,
  StyleSheet,
  View,
} from 'react-native';

import { colors, fonts, fontSizes, radius, spacing } from '@/theme/tokens';

import { FieldLabel } from './FieldLabel';
import { AppText } from './Text';

/** What a TextInput ref points at (focus(), blur(), clear()). */
export type TextInputRef = ComponentRef<typeof RNTextInput>;

export type TextInputProps = Omit<RNTextInputProps, 'style'> & {
  testID: string;
  label: string;
  helper?: string;
  error?: string;
  /** Element inside the field on the right (e.g. the password toggle). */
  accessory?: ReactNode;
  /** Shows a red asterisk after the label and tells screen readers the field is required. */
  required?: boolean;
  /** Element on the right of the label row (e.g. "Forgot password?"). */
  labelAccessory?: ReactNode;
  ref?: Ref<TextInputRef>;
};

const HEIGHT = 48;
const MULTILINE_HEIGHT = 96;

/**
 * D32 labelled input: 48 pt, radius 12, 15-pt text, 1-px border at rest, 1.5-px ring while focused, 1.5-px
 * destructive + 13-pt message on error, muted fill when disabled.
 * testIDs: `{id}` input, `{id}.field`, `{id}.labelRow`, `{id}.required`, `{id}.error`, `{id}.helper`.
 */
export function TextInput({
  testID,
  label,
  helper,
  error,
  accessory,
  required,
  labelAccessory,
  accessibilityLabel,
  editable = true,
  multiline,
  onFocus,
  onBlur,
  ref,
  ...rest
}: TextInputProps) {
  const [focused, setFocused] = useState(false);
  const hasError = !!error;
  const borderStyle = hasError ? styles.borderError : focused ? styles.borderFocused : styles.borderRest;
  const spokenLabel = accessibilityLabel ?? label;
  return (
    <View style={styles.container}>
      <View testID={`${testID}.labelRow`} style={styles.labelRow}>
        <FieldLabel
          testID={testID}
          label={label}
          required={required}
          nativeID={`${testID}.label`}
          style={styles.label}
        />
        {labelAccessory}
      </View>
      <View
        testID={`${testID}.field`}
        style={[styles.field, borderStyle, multiline && styles.fieldMultiline, !editable && styles.disabled]}
      >
        <RNTextInput
          ref={ref}
          testID={testID}
          accessibilityLabel={required ? `${spokenLabel}, required` : spokenLabel}
          accessibilityLabelledBy={`${testID}.label`}
          accessibilityHint={error}
          accessibilityState={{ disabled: !editable }}
          editable={editable}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : undefined}
          placeholderTextColor={colors.placeholder}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, !editable && styles.inputDisabled]}
          {...rest}
        />
        {accessory}
      </View>
      {hasError ? (
        <AppText
          testID={`${testID}.error`}
          variant="secondary"
          color="errorText"
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
        >
          {error}
        </AppText>
      ) : helper ? (
        <AppText testID={`${testID}.helper`} variant="secondary" color="mutedForeground">
          {helper}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // D32: label-to-field 6.
  container: { gap: spacing['1'] + spacing['0.5'], alignSelf: 'stretch' },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing['2'],
  },
  label: { flexShrink: 1 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: HEIGHT,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing['3'],
  },
  fieldMultiline: { minHeight: MULTILINE_HEIGHT, alignItems: 'flex-start' },
  borderRest: { borderWidth: 1, borderColor: colors.border },
  borderFocused: { borderWidth: 1.5, borderColor: colors.ring },
  borderError: { borderWidth: 1.5, borderColor: colors.destructive },
  input: {
    flex: 1,
    alignSelf: 'stretch',
    ...fontSizes.base,
    // RN clips text with a fixed lineHeight inside inputs on Android; let it size itself.
    lineHeight: undefined,
    fontFamily: fonts.regular,
    color: colors.foreground,
    paddingVertical: spacing['3'],
  },
  inputDisabled: { color: colors.mutedForeground },
  disabled: { backgroundColor: colors.muted },
});
