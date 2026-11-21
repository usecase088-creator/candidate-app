import type { SymbolViewProps } from 'expo-symbols';
import { StyleSheet } from 'react-native';

import { colors, radius, spacing } from '@/theme/tokens';

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
};

const HEIGHT = 32;
const ICON_SIZE = 14;
const REMOVE_ICON_SIZE = 16;
/** Pads the touch area of a 32-pt chip to 44 (D32), without changing its drawn size. */
const CHIP_SLOP = (44 - HEIGHT) / 2;
const REMOVE_SLOP = (44 - REMOVE_ICON_SIZE) / 2;
const XMARK = { ios: 'xmark', android: 'close', web: 'close' } as const;

/**
 * D32 selectable pill (categories, countries, cities, job types, sort). Tonal when idle, brandSoft + brand when
 * selected; press feedback and a selection haptic through PressableScale.
 */
export function Chip({ testID, label, selected, onPress, accessibilityLabel, icon, onRemove }: ChipProps) {
  const tint = selected ? colors.brand : colors.foreground;
  return (
    <PressableScale
      testID={testID}
      haptic="selection"
      hitSlop={CHIP_SLOP}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected ? styles.selected : styles.idle]}
    >
      {icon ? <Icon testID={`${testID}.icon`} name={icon} size={ICON_SIZE} tintColor={tint} /> : null}
      <AppText
        testID={`${testID}.label`}
        variant="secondary"
        weight="medium"
        color={selected ? 'brand' : 'foreground'}
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
