// D32 signature touch: the match score as an SVG ring (brand arc on a brandSoft track, the same drawing as the
// profile's CompletenessRing) that fills from 0 to the score once, on mount (600 ms ease-out; Reduce Motion: drawn
// full at once). Screen readers hear "{n}% match".
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { AppText } from '@/components/ui/Text';
import { colors } from '@/theme/tokens';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const FILL_MS = 600;
/** Below this size the % is set at 10 pt so "100%" stays inside the ring. */
const SMALL = 40;

/** The dash offset that leaves `value`% of the circle drawn. */
export function arcOffset(value: number, circumference: number): number {
  'worklet';
  return circumference * (1 - value / 100);
}

export function MatchRing({ value, size = 44, testID }: { value: number; size?: number; testID: string }) {
  const percent = Math.min(100, Math.max(0, Math.round(value)));
  const stroke = size >= SMALL ? 4 : 3;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const reduceMotion = useReducedMotion();
  const shown = useSharedValue(reduceMotion ? percent : 0);

  useEffect(() => {
    shown.set(
      reduceMotion ? percent : withTiming(percent, { duration: FILL_MS, easing: Easing.out(Easing.cubic) }),
    );
  }, [percent, reduceMotion, shown]);

  const arcProps = useAnimatedProps(() => ({ strokeDashoffset: arcOffset(shown.get(), circumference) }));

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`${percent}% match`}
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      style={{ width: size, height: size }}
    >
      {/* Start the arc at 12 o'clock with a View transform: the SVG rotation prop breaks on web. */}
      <View testID={`${testID}.rotor`} style={styles.rotated} pointerEvents="none">
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={colors.brandSoft}
            strokeWidth={stroke}
            fill="none"
          />
          <AnimatedCircle
            testID={`${testID}.arc`}
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={colors.brand}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            animatedProps={arcProps}
            fill="none"
          />
        </Svg>
      </View>
      <View style={styles.center} pointerEvents="none">
        <AppText
          variant="caption"
          weight="semibold"
          tabular
          numberOfLines={1}
          maxFontSizeMultiplier={1}
          style={size < SMALL ? styles.small : undefined}
        >
          {`${percent}%`}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rotated: { transform: [{ rotate: '-90deg' }] },
  center: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Stays inside a 36-pt ring.
  small: { fontSize: 10, lineHeight: 12 },
});
