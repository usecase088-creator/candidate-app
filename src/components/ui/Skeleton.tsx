import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { type DimensionValue, type LayoutChangeEvent, StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { colors, radius as radii } from '@/theme/tokens';

export type SkeletonProps = {
  testID?: string;
  width: DimensionValue;
  height: number;
  radius?: number;
};

const SHIMMER_MS = 1200;
const PULSE_MS = 700;
const SHIMMER_COLORS = [colors.muted, colors.brandSoft, colors.muted] as const;

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

/**
 * Loading placeholder (D32). A brandSoft strip sweeps left to right over 1200 ms; with Reduce Motion the block
 * pulses its opacity instead (a crossfade, no travel). Hidden from screen readers: the group announces "Loading".
 */
export function Skeleton({ testID, width, height, radius = radii.sm }: SkeletonProps) {
  const reduceMotion = useReducedMotion();
  const blockWidth = useSharedValue(0);
  const sweep = useSharedValue(0); // -1 (off the left edge) .. 1 (off the right edge)
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      opacity.set(
        withRepeat(
          withSequence(
            withTiming(0.5, { duration: PULSE_MS, easing: Easing.inOut(Easing.quad) }),
            withTiming(1, { duration: PULSE_MS, easing: Easing.inOut(Easing.quad) }),
          ),
          -1,
        ),
      );
    } else {
      sweep.set(-1);
      sweep.set(withRepeat(withTiming(1, { duration: SHIMMER_MS, easing: Easing.inOut(Easing.quad) }), -1));
    }
    return () => {
      cancelAnimation(opacity);
      cancelAnimation(sweep);
      opacity.set(1);
    };
  }, [reduceMotion, opacity, sweep]);

  const blockStyle = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  const stripStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sweep.get() * blockWidth.get() }],
  }));

  const onLayout = (e: LayoutChangeEvent) => blockWidth.set(e.nativeEvent.layout.width);

  return (
    <Animated.View
      testID={testID}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      onLayout={onLayout}
      style={[styles.block, { width, height, borderRadius: radius }, blockStyle]}
    >
      {!reduceMotion && (
        <AnimatedGradient
          testID={testID ? `${testID}.shimmer` : undefined}
          colors={SHIMMER_COLORS}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[StyleSheet.absoluteFill, stripStyle]}
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: colors.muted, overflow: 'hidden' },
});
