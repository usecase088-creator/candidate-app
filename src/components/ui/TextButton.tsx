import { StyleSheet } from 'react-native';

import { type ColorToken, spacing } from '@/theme/tokens';

import { PressableScale } from './PressableScale';
import { AppText } from './Text';

export type TextButtonProps = {
  testID: string;
  label: string;
  onPress: () => void;
  color?: ColorToken;
  accessibilityLabel?: string;
  disabled?: boolean;
};

/** Hit slop that takes the 20-pt line + 8-pt padding each side to a 44-pt touch target (D32). */
const SLOP = 12;

/**
 * D32 link-style action ("Forgot password?", "Edit signup details"): compact 14/500 text, no press scale (only the
 * opacity dips), touch target padded to 44 through hitSlop so it sits tight against its neighbours.
 */
export function TextButton({
  testID,
  label,
  onPress,
  color = 'brand',
  accessibilityLabel,
  disabled,
}: TextButtonProps) {
  return (
    <PressableScale
      testID={testID}
      pressScale={1}
      accessibilityLabel={accessibilityLabel ?? label}
      disabled={disabled}
      hitSlop={SLOP}
      onPress={onPress}
      style={styles.base}
    >
      <AppText variant="label" color={color} style={disabled && styles.disabledText}>
        {label}
      </AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: { paddingVertical: spacing['2'], alignSelf: 'flex-start' },
  // Like Button: the fade sits on the label; the pressable's own opacity belongs to the press animation.
  disabledText: { opacity: 0.5 },
});
