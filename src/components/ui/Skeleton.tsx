import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, type DimensionValue } from 'react-native';

import { colors, radius as radii } from '@/theme/tokens';

export type SkeletonProps = {
  testID?: string;
  width: DimensionValue;
  height: number;
  radius?: number;
};

/** Loading placeholder. Pulses unless the user turned on Reduce Motion. Hidden from screen readers. */
export function Skeleton({ testID, width, height, radius = radii.sm }: SkeletonProps) {
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    let loop: Animated.CompositeAnimation | undefined;
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce || cancelled) return;
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        ]),
      );
      loop.start();
    });
    return () => {
      cancelled = true;
      loop?.stop();
    };
  }, [opacity]);

  return (
    <Animated.View
      testID={testID}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{ width, height, borderRadius: radius, backgroundColor: colors.muted, opacity }}
    />
  );
}
