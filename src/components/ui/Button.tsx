import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, type PressableProps, StyleSheet, View } from 'react-native';

import { type ColorToken, colors, gradients, MIN_TOUCH, radius, spacing } from '@/theme/tokens';

import { AppText } from './Text';

export type ButtonVariant = 'primary' | 'brand' | 'outline' | 'ghost' | 'destructive' | 'gradient';

type VariantStyle = { bg: ColorToken | 'transparent'; fg: ColorToken; border?: ColorToken };

const VARIANTS: Record<ButtonVariant, VariantStyle> = {
  primary: { bg: 'primary', fg: 'primaryForeground' },
  brand: { bg: 'brand', fg: 'brandForeground' },
  outline: { bg: 'surface', fg: 'foreground', border: 'border' },
  ghost: { bg: 'transparent', fg: 'foreground' },
  destructive: { bg: 'destructive', fg: 'destructiveForeground' },
  // The gradient covers the fill; navy underneath while it draws.
  gradient: { bg: 'primary', fg: 'primaryForeground' },
};

export type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  testID: string;
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  fullWidth?: boolean;
};

export function Button({
  testID,
  label,
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = true,
  accessibilityLabel,
  onPress,
  ...rest
}: ButtonProps) {
  const v = VARIANTS[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        fullWidth && styles.fullWidth,
        {
          backgroundColor: v.bg === 'transparent' ? 'transparent' : colors[v.bg],
          ...(v.border ? { borderWidth: 1, borderColor: colors[v.border] } : {}),
        },
        pressed && !inactive && styles.pressed,
        disabled && !loading && styles.disabled,
      ]}
      {...rest}
    >
      {variant === 'gradient' && (
        <LinearGradient
          testID={`${testID}.gradient`}
          colors={gradients.signup.colors}
          locations={gradients.signup.locations}
          // 135deg: top-left to bottom-right.
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      <View style={styles.content}>
        {loading && <ActivityIndicator testID={`${testID}.spinner`} color={colors[v.fg]} size="small" />}
        <AppText variant="label" weight="semibold" color={v.fg} align="center">
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: MIN_TOUCH,
    borderRadius: radius.md,
    paddingHorizontal: spacing['4'],
    paddingVertical: spacing['3'],
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fullWidth: { alignSelf: 'stretch' },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing['2'], flexShrink: 1 },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
});
