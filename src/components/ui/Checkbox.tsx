import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, MIN_TOUCH, radius, spacing } from '@/theme/tokens';

import { AppText } from './Text';

export type CheckboxProps = {
  testID: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Spoken name; the visible label can contain links, so screen readers get a plain version. */
  accessibilityLabel: string;
  children: ReactNode;
  invalid?: boolean;
};

/** Website signup consent checkboxes (accent #3778D7). The whole row is the touch target. */
export function Checkbox({
  testID,
  checked,
  onChange,
  accessibilityLabel,
  children,
  invalid,
}: CheckboxProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="checkbox"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      style={styles.row}
    >
      <View
        style={[
          styles.box,
          checked && styles.checked,
          invalid && !checked && { borderColor: colors.destructive },
        ]}
      >
        {checked ? (
          <AppText variant="caption" weight="bold" color="primaryForeground">
            ✓
          </AppText>
        ) : null}
      </View>
      <View style={styles.label}>
        {typeof children === 'string' ? <AppText variant="caption">{children}</AppText> : children}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing['3'],
    minHeight: MIN_TOUCH,
    alignItems: 'flex-start',
    paddingVertical: spacing['1'],
  },
  box: {
    width: 20,
    height: 20,
    marginTop: 2,
    borderWidth: 1.5,
    borderColor: colors.input,
    borderRadius: radius.sm / 2,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checked: { backgroundColor: colors.checkbox, borderColor: colors.checkbox },
  label: { flex: 1 },
});
