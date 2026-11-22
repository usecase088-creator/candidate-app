import type { SymbolViewProps } from 'expo-symbols';
import { StyleSheet } from 'react-native';

import { colors, radius, spacing, touchSlop } from '@/theme/tokens';

import { Icon } from './Icon';
import { PressableScale } from './PressableScale';
import { AppText } from './Text';

export type ChipProps = {
  testID: string;
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Spoken label; defaults to `label`. */
  accessibilityLabel?: string;
  /** Optional 14-pt leading icon, drawn in the text colour. */
  icon?: SymbolViewProps['name'];
  /** Adds a trailing 16-pt clear button (`{testID}.remove`, "Remove {label}") that fires instead of onPress. */
  onRemove?: () => void;
  /** Ignores presses and says "disabled" (e.g. while the answers are being sent). */
  disabled?: boolean;
  /**
   * In a question (R3 a11y P2-12): `radio` (one answer) or `checkbox` (several), spoken with `checked`. Default: a
   * filter button with `selected`.
   */
  role?: 'radio' | 'checkbox';
};

const HEIGHT = 32;
const ICON_SIZE = 14;
const REMOVE_ICON_SIZE = 16;
/** Pads the touch area of a 32-pt chip to MIN_TOUCH (48: Android 48 dp, iOS 44 pt), without changing its drawn size. */
export const CHIP_SLOP = touchSlop(HEIGHT);
const REMOVE_SLOP = touchSlop(REMOVE_ICON_SIZE);
const XMARK = { ios: 'xmark', android: 'close', web: 'close' } as const;

/**
 * D32 selectable pill (categories, countries, cities, job types, sort). Tonal when idle, brandSoft + brand when
 * selected; press feedback and a selection haptic through PressableScale.
 */
export function Chip({
  testID,
  label,
  selected,
  onPress,
  accessibilityLabel,
  icon,
  onRemove,
  disabled,
  role,
}: ChipProps) {
  const tint = selected ? colors.brand : colors.foreground;
  return (
    <PressableScale
      testID={testID}
      haptic="selection"
      hitSlop={CHIP_SLOP}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole={role ?? 'button'}
      accessibilityState={role ? { checked: selected } : { selected }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.chip, selected ? styles.selected : styles.idle]}
    >
      {icon ? <Icon testID={`${testID}.icon`} name={icon} size={ICON_SIZE} tintColor={tint} /> : null}
      <AppText
        testID={`${testID}.label`}
        variant="secondary"
        weight="medium"
        color={selected ? 'brandText' : 'foreground'}
        numberOfLines={1}
      >
        {label}
      </AppText>
      {onRemove ? (
        <PressableScale
          testID={`${testID}.remove`}
          accessibilityLabel={`Remove ${label}`}
          hitSlop={REMOVE_SLOP}
          onPress={onRemove}
          style={styles.remove}
        >
          <Icon testID={`${testID}.remove.icon`} name={XMARK} size={REMOVE_ICON_SIZE} tintColor={tint} />
        </PressableScale>
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing['1'],
    minHeight: HEIGHT,
    borderRadius: radius.full,
    paddingHorizontal: spacing['3'],
  },
  idle: { backgroundColor: colors.fill },
  // minHeight is the border box in Yoga, so the chip stays 32 tall in both states.
  selected: { backgroundColor: colors.brandSoft, borderWidth: 1.5, borderColor: colors.brand },
  remove: { borderRadius: radius.full },
});
