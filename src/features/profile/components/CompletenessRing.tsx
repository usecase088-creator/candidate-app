import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { AppText } from '@/components/ui/Text';
import { colors } from '@/theme/tokens';

const SIZE = 56;
const STROKE = 5;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * D32 Profile tab: the website's completeness number as a 56-pt ring (brand arc on a brandSoft track) with the
 * percentage inside. Screen readers hear the website sentence, "Profile completeness: 94%".
 */
export function CompletenessRing({ testID, percent }: { testID: string; percent: number }) {
  const value = Math.min(100, Math.max(0, Math.round(percent)));
  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Profile completeness: ${value}%`}
      accessibilityValue={{ min: 0, max: 100, now: value }}
      style={styles.wrap}
    >
      <Svg width={SIZE} height={SIZE} pointerEvents="none" style={styles.rotated}>
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={colors.brandSoft}
          strokeWidth={STROKE}
          fill="none"
        />
        <Circle
          testID={`${testID}.arc`}
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={colors.brand}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          strokeDashoffset={CIRCUMFERENCE * (1 - value / 100)}
          fill="none"
        />
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <AppText variant="label" weight="semibold" tabular maxFontSizeMultiplier={1.2} numberOfLines={1}>
          {`${value}%`}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Start the arc at 12 o'clock. A View transform works on iOS, Android and web (the SVG rotation prop breaks on web).
  rotated: { transform: [{ rotate: '-90deg' }] },
  wrap: { width: SIZE, height: SIZE },
  center: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
