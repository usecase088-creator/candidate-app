import { Pressable, StyleSheet } from 'react-native';

import { colors, MIN_TOUCH, radius, spacing } from '@/theme/tokens';

import { AppText } from './Text';

export type ChipProps = {
  testID: string;
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Spoken label; defaults to `label`. */
  accessibilityLabel?: string;
};

/** Selectable pill (categories, countries, cities, job types). Website: bg-primary when active. */
export function Chip({ testID, label, selected, onPress, accessibilityLabel }: ChipProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected ? styles.selected : styles.idle]}
    >
      <AppText variant="caption" weight="semibold" color={selected ? 'primaryForeground' : 'foreground'}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: MIN_TOUCH - 8,
    justifyContent: 'center',
    borderRadius: radius.xl,
    borderWidth: 1,
    paddingHorizontal: spacing['4'],
    paddingVertical: spacing['2'],
  },
  idle: { backgroundColor: colors.surface, borderColor: colors.border },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
});
