import { useCallback } from 'react';
import { Platform, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { type HapticKind, haptic } from '@/lib/haptics';
import { motion } from '@/theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Android gets a ripple clipped to the caller's shape (in front of the children); iOS relies on scale + opacity. */
export const rippleFor = (os: typeof Platform.OS): PressableProps['android_ripple'] =>
  os === 'android' ? { color: motion.ripple, foreground: true } : undefined;

export type PressableScaleProps = Omit<PressableProps, 'style' | 'children'> & {
  testID: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** What the press means (D32 haptic map). Default none: plain navigation taps stay silent. */
  haptic?: HapticKind;
  /** Scale while pressed; the default is the system value. 1 keeps only the opacity change. */
  pressScale?: number;
};

/**
 * The one press-feedback wrapper (D32): every row, card, chip, icon button and the search bar use it.
 * iOS: scale 0.97 + opacity 0.9 within a frame (UI thread, no bounce). Android: the same plus a ripple clipped to the
 * caller's shape. Reduce Motion: opacity only. The haptic fires with the press, before onPress runs.
 */
export function PressableScale({
  haptic: kind = 'none',
  pressScale = motion.pressScale,
  onPress,
  onPressIn,
  onPressOut,
  disabled,
  accessibilityRole = 'button',
  style,
  children,
  ...rest
}: PressableScaleProps) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
    opacity: opacity.get(),
  }));

  const handleIn = useCallback<NonNullable<PressableProps['onPressIn']>>(
    (e) => {
      // .set(): the React Compiler-safe way to write a shared value (Reanimated 4).
      scale.set(reduceMotion ? 1 : withSpring(pressScale, motion.spring));
      opacity.set(withTiming(motion.pressOpacity, { duration: motion.duration.press }));
      onPressIn?.(e);
    },
    [onPressIn, opacity, pressScale, reduceMotion, scale],
  );

  const handleOut = useCallback<NonNullable<PressableProps['onPressOut']>>(
    (e) => {
      scale.set(withSpring(1, motion.spring));
      opacity.set(withTiming(1, { duration: motion.duration.press }));
      onPressOut?.(e);
    },
    [onPressOut, opacity, scale],
  );

  const handlePress = useCallback<NonNullable<PressableProps['onPress']>>(
    (e) => {
      if (kind !== 'none') haptic(kind);
      onPress?.(e);
    },
    [kind, onPress],
  );

  return (
    <AnimatedPressable
      accessibilityRole={accessibilityRole}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={handlePress}
      onPressIn={handleIn}
      onPressOut={handleOut}
      android_ripple={rippleFor(Platform.OS)}
      style={[style, animated]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
