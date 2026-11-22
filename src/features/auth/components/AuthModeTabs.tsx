import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { PressableScale } from '@/components/ui/PressableScale';
import { AppText } from '@/components/ui/Text';
import { colors, motion, radius, shadows, spacing } from '@/theme/tokens';

type Mode = 'signin' | 'signup';

const TABS: { mode: Mode; label: string; href: '/login' | '/signup' }[] = [
  { mode: 'signin', label: 'Sign In', href: '/login' },
  { mode: 'signup', label: 'Create Account', href: '/signup' },
];

/**
 * D32 segmented control, the selected segment is a white tile. R3: the track is at least 48 (40-pt segments + the
 * inset slop = a 48 target) and grows with the text; the indicator is pinned top/bottom, so it follows the height.
 */
const TRACK_MIN_HEIGHT = 48;
const INSET = spacing['1'];

/**
 * Website auth.tsx mode tabs "Sign In" | "Create Account" (separate routes in the app). D32: segmented control, the
 * white segment slides to the tapped tab (220 ms ease-out; Reduce Motion: no slide) while the other route replaces
 * this one. testIDs: `auth.tabs`, `auth.tabs.indicator`, `auth.tab.{mode}`.
 */
export function AuthModeTabs({ active }: { active: Mode }) {
  const reduceMotion = useReducedMotion();
  const [selected, setSelected] = useState<Mode>(active);
  const [segment, setSegment] = useState(0);
  const x = useSharedValue(0);

  const index = TABS.findIndex((t) => t.mode === selected);
  useEffect(() => {
    const to = index * segment;
    x.set(
      reduceMotion
        ? to
        : withTiming(to, { duration: motion.duration.enter, easing: Easing.out(Easing.cubic) }),
    );
  }, [index, segment, reduceMotion, x]);

  const slide = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));

  const onLayout = (e: LayoutChangeEvent) => {
    const width = (e.nativeEvent.layout.width - INSET * 2) / TABS.length;
    // First layout: jump into place, no slide in from the left.
    x.set(index * width);
    setSegment(width);
  };

  return (
    <View testID="auth.tabs" accessibilityRole="tablist" onLayout={onLayout} style={styles.track}>
      <Animated.View
        testID="auth.tabs.indicator"
        pointerEvents="none"
        style={[styles.indicator, { width: segment }, slide]}
      />
      {TABS.map(({ mode, label, href }) => {
        const isSelected = mode === selected;
        return (
          <PressableScale
            key={mode}
            testID={`auth.tab.${mode}`}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: isSelected }}
            haptic={isSelected ? 'none' : 'selection'}
            pressScale={1}
            // 40-pt segment inside the 48-pt track: the slop takes the touch target to the track's full height.
            hitSlop={INSET}
            onPress={() => {
              if (mode === active) return;
              setSelected(mode);
              router.replace(href);
            }}
            style={styles.tab}
          >
            <AppText
              variant="button"
              align="center"
              color={isSelected ? 'foreground' : 'mutedForeground'}
              // Found on the phone: auto-shrink took the labels to ~6 pt at font scale 2. Capped at 1.3 (button
              // variant) and allowed a second line instead.
              numberOfLines={2}
              style={styles.label}
            >
              {label}
            </AppText>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    minHeight: TRACK_MIN_HEIGHT,
    padding: INSET,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
  },
  indicator: {
    position: 'absolute',
    top: INSET,
    bottom: INSET,
    left: INSET,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    boxShadow: shadows.soft,
  },
  tab: {
    flex: 1,
    minHeight: TRACK_MIN_HEIGHT - INSET * 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    paddingHorizontal: spacing['2'],
  },
  label: { flexShrink: 1 },
});
