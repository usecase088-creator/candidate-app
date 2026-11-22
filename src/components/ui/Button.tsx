import { LinearGradient } from 'expo-linear-gradient';
import { type SymbolViewProps } from 'expo-symbols';
import { ActivityIndicator, type PressableProps, StyleSheet, View } from 'react-native';

import { type HapticKind } from '@/lib/haptics';
import { type ColorToken, colors, gradients, radius, spacing, touchSlop } from '@/theme/tokens';

import { Icon } from './Icon';
import { PressableScale } from './PressableScale';
import { AppText } from './Text';

export type ButtonVariant =
  'primary' | 'brand' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'destructiveText' | 'gradient';
export type ButtonSize = 'lg' | 'md' | 'sm';

type VariantStyle = { bg: ColorToken | 'transparent'; fg: ColorToken; border?: ColorToken };

const VARIANTS: Record<ButtonVariant, VariantStyle> = {
  /** The one filled primary action per screen (navy). */
  primary: { bg: 'primary', fg: 'primaryForeground' },
  brand: { bg: 'brand', fg: 'brandForeground' },
  /** Tonal: the second action next to a primary. */
  secondary: { bg: 'fill', fg: 'foreground' },
  outline: { bg: 'surface', fg: 'foreground', border: 'border' },
  ghost: { bg: 'transparent', fg: 'foreground' },
  destructive: { bg: 'destructive', fg: 'destructiveForeground' },
  destructiveText: { bg: 'transparent', fg: 'errorText' },
  // The gradient covers the fill; navy underneath while it draws.
  gradient: { bg: 'primary', fg: 'primaryForeground' },
};

/** D32: lg = screen CTAs, md = inline actions, sm = actions inside rows and cards. */
const SIZES: Record<ButtonSize, { minHeight: number; paddingHorizontal: number; paddingVertical: number }> = {
  lg: { minHeight: 48, paddingHorizontal: spacing['4'], paddingVertical: spacing['3'] },
  md: { minHeight: 44, paddingHorizontal: spacing['4'], paddingVertical: spacing['2'] },
  sm: { minHeight: 36, paddingHorizontal: spacing['3'], paddingVertical: spacing['1'] },
};

export type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  testID: string;
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  /** What the press means (D32 haptic map); default none. */
  haptic?: HapticKind;
  /** Leading 18-pt icon. */
  icon?: SymbolViewProps['name'];
  /**
   * Cross-axis placement. Default: `stretch` when fullWidth, `start` when it hugs. `center` for the hugging action of
   * a centred block (empty and error states).
   */
  align?: 'start' | 'center' | 'stretch';
  /** Overrides the button label's font-scale cap (default 1.3 from the `button` text variant). */
  maxFontSizeMultiplier?: number;
};

export function Button({
  testID,
  label,
  variant = 'primary',
  size = 'lg',
  loading = false,
  disabled = false,
  fullWidth = true,
  align,
  haptic,
  icon,
  maxFontSizeMultiplier,
  accessibilityLabel,
  onPress,
  ...rest
}: ButtonProps) {
  const v = VARIANTS[variant];
  const inactive = disabled || loading;
  const mutedLook = disabled && !loading && v.bg !== 'transparent';
  const fg: ColorToken = mutedLook ? 'mutedForeground' : v.fg;

  return (
    <PressableScale
      testID={testID}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      haptic={haptic}
      onPress={onPress}
      // R3 #11: sm (36) and md (44) reach the 48 touch target without growing (a caller hitSlop wins).
      hitSlop={{ top: touchSlop(SIZES[size].minHeight), bottom: touchSlop(SIZES[size].minHeight) }}
      style={[
        styles.base,
        SIZES[size],
        fullWidth ? styles.fullWidth : styles.hug,
        align && ALIGN[align],
        {
          backgroundColor: mutedLook ? colors.muted : v.bg === 'transparent' ? 'transparent' : colors[v.bg],
          ...(v.border && !mutedLook ? { borderWidth: 1, borderColor: colors[v.border] } : {}),
        },
        disabled && !loading && v.bg === 'transparent' && styles.disabledText,
      ]}
      {...rest}
    >
      {variant === 'gradient' && !mutedLook && (
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
      <View testID={`${testID}.content`} style={[styles.content, loading && styles.invisible]}>
        {icon && <Icon testID={`${testID}.icon`} name={icon} tintColor={colors[fg]} size={18} />}
        <AppText variant="button" color={fg} align="center" maxFontSizeMultiplier={maxFontSizeMultiplier}>
          {label}
        </AppText>
      </View>
      {loading && (
        <View style={styles.spinner} pointerEvents="none">
          <ActivityIndicator testID={`${testID}.spinner`} color={colors[fg]} size="small" />
        </View>
      )}
    </PressableScale>
  );
}

const ALIGN = {
  start: { alignSelf: 'flex-start' },
  center: { alignSelf: 'center' },
  stretch: { alignSelf: 'stretch' },
} as const;

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fullWidth: { alignSelf: 'stretch' },
  hug: { alignSelf: 'flex-start' },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing['2'], flexShrink: 1 },
  // Loading keeps the width: the label stays in layout, invisible, and the spinner sits over it.
  invisible: { opacity: 0 },
  spinner: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledText: { opacity: 0.5 },
});
