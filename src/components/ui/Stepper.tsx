import type { SymbolViewProps } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/theme/tokens';

import { Icon } from './Icon';
import { PressableScale } from './PressableScale';
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

const HEIGHT = 36;
const BUTTON_WIDTH = 44;
const ICON_SIZE = 20;
const MINUS = { ios: 'minus', android: 'remove', web: 'remove' } as const;
const PLUS = { ios: 'plus', android: 'add', web: 'add' } as const;

/**
 * D32 compact stepper: a 36-pt surface2 pill with two 44 x 36 icon buttons around a tabular value.
 * Used where the website has a slider: sliders are hard to hit on small phones and need a native library.
 */
export function Stepper({ testID, label, value, min, max, step, display, onChange }: Props) {
  return (
    <View testID={testID} style={styles.pill}>
      <StepButton
        testID={`${testID}.minus`}
        label={`Decrease ${label}`}
        icon={MINUS}
        disabled={value <= min}
        onPress={() => onChange(Math.max(min, value - step))}
      />
      <AppText
        testID={`${testID}.value`}
        variant="body"
        weight="semibold"
        tabular
        align="center"
        numberOfLines={1}
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
        icon={PLUS}
        disabled={value >= max}
        onPress={() => onChange(Math.min(max, value + step))}
      />
    </View>
  );
}

function StepButton({
  testID,
  label,
  icon,
  disabled,
  onPress,
}: {
  testID: string;
  label: string;
  icon: SymbolViewProps['name'];
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      testID={testID}
      haptic="selection"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={styles.button}
    >
      <Icon
        testID={`${testID}.icon`}
        name={icon}
        size={ICON_SIZE}
        tintColor={disabled ? colors.mutedForeground : colors.foreground}
      />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    minHeight: HEIGHT,
    borderRadius: radius.full,
    backgroundColor: colors.surface2,
    overflow: 'hidden',
  },
  value: { minWidth: 64, paddingHorizontal: spacing['1'] },
  button: {
    width: BUTTON_WIDTH,
    height: HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
});
