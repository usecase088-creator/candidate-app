import type { ComponentRef, ReactNode, Ref } from 'react';
import {
  TextInput as RNTextInput,
  type TextInputProps as RNTextInputProps,
  StyleSheet,
  View,
} from 'react-native';

import { colors, fonts, fontSizes, MIN_TOUCH, radius, spacing } from '@/theme/tokens';

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
  ref?: Ref<TextInputRef>;
};

/** Labelled input with helper and error text. testIDs: `{id}` input, `{id}.field`, `{id}.error`. */
export function TextInput({
  testID,
  label,
  helper,
  error,
  accessory,
  accessibilityLabel,
  editable = true,
  ref,
  ...rest
}: TextInputProps) {
  const hasError = !!error;
  return (
    <View style={styles.container}>
      <AppText variant="label" nativeID={`${testID}.label`}>
        {label}
      </AppText>
      <View
        testID={`${testID}.field`}
        style={[
          styles.field,
          { borderColor: hasError ? colors.destructive : colors.input },
          !editable && styles.disabled,
        ]}
      >
        <RNTextInput
          ref={ref}
          testID={testID}
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityLabelledBy={`${testID}.label`}
          accessibilityHint={error}
          accessibilityState={{ disabled: !editable }}
          editable={editable}
          placeholderTextColor={colors.mutedForeground}
          style={styles.input}
          {...rest}
        />
        {accessory}
      </View>
      {hasError ? (
        <AppText
          testID={`${testID}.error`}
          variant="caption"
          color="errorText"
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
        >
          {error}
        </AppText>
      ) : helper ? (
        <AppText testID={`${testID}.helper`} variant="caption" color="mutedForeground">
          {helper}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing['2'], alignSelf: 'stretch' },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MIN_TOUCH,
    borderWidth: 1,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing['3'],
  },
  input: {
    flex: 1,
    ...fontSizes.sm,
    // RN clips text with a fixed lineHeight inside inputs on Android; let it size itself.
    lineHeight: undefined,
    fontFamily: fonts.regular,
    color: colors.foreground,
    paddingVertical: spacing['3'],
  },
  disabled: { opacity: 0.6, backgroundColor: colors.muted },
});
