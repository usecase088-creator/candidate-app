import { Pressable, StyleSheet } from 'react-native';

import { type ColorToken, MIN_TOUCH, spacing } from '@/theme/tokens';

import { AppText } from './Text';

export type TextButtonProps = {
  testID: string;
  label: string;
  onPress: () => void;
  color?: ColorToken;
  accessibilityLabel?: string;
  disabled?: boolean;
};

/** Link-style action ("Forgot password?", "Edit signup details"). Full touch height even though it looks like text. */
export function TextButton({
  testID,
  label,
  onPress,
  color = 'brand',
  accessibilityLabel,
  disabled,
}: TextButtonProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      hitSlop={spacing['1']}
      onPress={onPress}
      style={({ pressed }) => [styles.base, pressed && styles.pressed]}
    >
      <AppText variant="caption" weight="semibold" color={color}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: MIN_TOUCH, justifyContent: 'center', alignSelf: 'flex-start' },
  pressed: { opacity: 0.7 },
});
