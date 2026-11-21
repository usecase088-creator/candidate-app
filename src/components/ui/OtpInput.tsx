import { useRef } from 'react';
import { TextInput as RNTextInput, StyleSheet, View } from 'react-native';

import { colors, fonts, fontSizes, radius, spacing } from '@/theme/tokens';

import { otpAutofill } from './otpAutofill';
import { AppText } from './Text';

const LENGTH = 6;
const BOX_HEIGHT = 52;

export type OtpInputProps = {
  testID: string;
  label: string;
  value: string;
  onChangeText: (digits: string) => void;
  /** Called once per completed code, when the 6th digit lands (typed, pasted or autofilled). Never twice for the same code. */
  onComplete?: (code: string) => void;
  error?: string;
  autoFocus?: boolean;
};

/**
 * Six boxes drawn over one real TextInput (boxes on top, touches pass through), so typing, paste and SMS
 * autofill all work and screen readers still reach the input.
 * D32: 52-pt boxes, radius 12, 22/600 tabular digits, surface2 once filled, 1.5-px ring on the active box.
 * testIDs: `{id}` input, `{id}.box.N`, `{id}.boxes`, `{id}.error`.
 */
export function OtpInput({
  testID,
  label,
  value,
  onChangeText,
  onComplete,
  error,
  autoFocus,
}: OtpInputProps) {
  // The last code handed to onComplete: a 7th key press or a repeated autofill event yields the same 6 digits again
  // and must not submit twice.
  const completed = useRef<string | null>(null);
  const handleChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, LENGTH);
    onChangeText(digits);
    if (digits.length < LENGTH) {
      completed.current = null;
    } else if (completed.current !== digits) {
      completed.current = digits;
      onComplete?.(digits);
    }
  };

  return (
    <View style={styles.container}>
      <AppText variant="label" nativeID={`${testID}.label`}>
        {label}
      </AppText>
      <View>
        {/* The input is drawn first, under the opaque boxes. */}
        <RNTextInput
          testID={testID}
          accessibilityLabel={label}
          accessibilityHint={error}
          value={value}
          onChangeText={handleChange}
          keyboardType="number-pad"
          maxLength={LENGTH}
          autoFocus={autoFocus}
          caretHidden
          {...otpAutofill}
          style={styles.hiddenInput}
        />
        <View
          testID={`${testID}.boxes`}
          style={styles.row}
          // Touches go through to the input underneath.
          pointerEvents="none"
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
        >
          {Array.from({ length: LENGTH }, (_, i) => {
            const active = i === value.length;
            const filled = i < value.length;
            return (
              <View
                key={i}
                testID={`${testID}.box.${i}`}
                style={[
                  styles.box,
                  filled && styles.filled,
                  active && styles.active,
                  error && styles.errorBox,
                ]}
              >
                <AppText variant="title" tabular accessibilityRole="none">
                  {value[i] ?? ''}
                </AppText>
              </View>
            );
          })}
        </View>
      </View>
      {error ? (
        <AppText
          testID={`${testID}.error`}
          variant="secondary"
          color="errorText"
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
        >
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing['2'], alignSelf: 'stretch' },
  row: { flexDirection: 'row', gap: spacing['2'] },
  box: {
    flex: 1,
    minHeight: BOX_HEIGHT,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filled: { backgroundColor: colors.surface2 },
  active: { borderWidth: 1.5, borderColor: colors.ring },
  errorBox: { borderColor: colors.destructive },
  // Same area as the boxes, drawn under them. Not transparent: at opacity 0.02 digits showed through on Android,
  // and at 0 Android dropped it from the accessibility tree. Text in the box colour, in case any edge shows.
  hiddenInput: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    color: colors.surface,
    backgroundColor: colors.surface,
    fontFamily: fonts.regular,
    fontSize: fontSizes.base.fontSize,
  },
});
