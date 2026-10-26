import { Pressable, StyleSheet, View } from 'react-native';

import { colors, MIN_TOUCH, radius, spacing } from '@/theme/tokens';

import { AppText } from './Text';

type Props = {
  /** `{testID}.minus`, `{testID}.plus`, `{testID}.value`. */
  testID: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  /** Text between the buttons, e.g. "5 yrs". */
  display: string;
  onChange: (value: number) => void;
};

/** − / + control. Used where the website has a slider: sliders are hard to hit on small phones and need a native library. */
export function Stepper({ testID, label, value, min, max, step, display, onChange }: Props) {
  return (
    <View style={styles.row}>
      <StepButton
        testID={`${testID}.minus`}
        label={`Decrease ${label}`}
        symbol="−"
        disabled={value <= min}
        onPress={() => onChange(Math.max(min, value - step))}
      />
      <AppText
        testID={`${testID}.value`}
        variant="label"
        weight="semibold"
        align="center"
        style={styles.value}
        accessibilityLabel={`${label}: ${display}`}
        accessibilityRole="adjustable"
        accessibilityValue={{ min, max, now: value, text: display }}
      >
        {display}
      </AppText>
      <StepButton
        testID={`${testID}.plus`}
        label={`Increase ${label}`}
        symbol="+"
        disabled={value >= max}
        onPress={() => onChange(Math.min(max, value + step))}
      />
    </View>
  );
}

function StepButton({
  testID,
  label,
  symbol,
  disabled,
  onPress,
}: {
  testID: string;
  label: string;
  symbol: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, disabled && styles.disabled]}
    >
      <AppText variant="heading" color="primary">
        {symbol}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing['3'] },
  value: { flex: 1 },
  button: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  disabled: { opacity: 0.4 },
});
