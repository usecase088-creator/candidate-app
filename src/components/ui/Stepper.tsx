import type { SymbolViewProps } from 'expo-symbols';
import { type AccessibilityActionEvent, StyleSheet, View } from 'react-native';

import { colors, MIN_TOUCH, radius, spacing } from '@/theme/tokens';

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

/** Drawn height of the tonal pill. */
const HEIGHT = 36;
/** R3 a11y P2-9: the buttons are 48 x 48 touch areas; the pill drawn behind them stays 36 tall. */
const TOUCH = MIN_TOUCH;
const ICON_SIZE = 20;
const MINUS = { ios: 'minus', android: 'remove', web: 'remove' } as const;
const PLUS = { ios: 'plus', android: 'add', web: 'add' } as const;

/**
 * D32 compact stepper: a 36-pt tonal (`fill`) pill with two icon buttons around a tabular value. The buttons are
 * 48 x 48 touch areas (the pill is drawn behind them, so Android does not clip a hitSlop at the pill's edge).
 * Screen readers: the value is "adjustable" and swipe up / down steps it (R3 #15).
 * Used where the website has a slider: sliders are hard to hit on small phones and need a native library.
 */
export function Stepper({ testID, label, value, min, max, step, display, onChange }: Props) {
  const down = () => onChange(Math.max(min, value - step));
  const up = () => onChange(Math.min(max, value + step));
  const onAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'increment') up();
    else if (e.nativeEvent.actionName === 'decrement') down();
  };
  return (
    <View testID={testID} style={styles.root}>
      <View testID={`${testID}.pill`} pointerEvents="none" style={styles.pill} />
      <StepButton
        testID={`${testID}.minus`}
        label={`Decrease ${label}`}
        icon={MINUS}
        disabled={value <= min}
        onPress={down}
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
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={onAction}
      >
        {display}
      </AppText>
      <StepButton
        testID={`${testID}.plus`}
        label={`Increase ${label}`}
        icon={PLUS}
        disabled={value >= max}
        onPress={up}
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
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    minHeight: TOUCH,
  },
  // Drawn behind the buttons and the value, centred in the 48-pt row.
  pill: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: (TOUCH - HEIGHT) / 2,
    bottom: (TOUCH - HEIGHT) / 2,
    borderRadius: radius.full,
    backgroundColor: colors.fill,
  },
  value: { minWidth: 64, paddingHorizontal: spacing['1'] },
  button: {
    width: TOUCH,
    height: TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
});
