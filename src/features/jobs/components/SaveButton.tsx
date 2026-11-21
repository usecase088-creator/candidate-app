import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { AppText } from '@/components/ui/Text';
import { colors, MIN_TOUCH, motion, radius, spacing } from '@/theme/tokens';

type Props = {
  /** `job.save.{jobId}` etc. */
  testID: string;
  saved: boolean;
  onPress: () => void;
  /** "icon": the bookmark on cards. "button": "Save job" / "Saved" on job details. */
  variant?: 'icon' | 'button';
  /** Button variant height: lg 48 (default) or md 44, to sit next to a md Button in a sticky bar (D32). */
  size?: 'lg' | 'md';
};

const bookmark = (saved: boolean) =>
  ({ ios: saved ? 'bookmark.fill' : 'bookmark', android: 'bookmark', web: 'bookmark' }) as const;

/** R2 signature touch 3: the bookmark pops (1 -> 1.25 -> 1, about 260 ms) when it becomes saved. */
const POP_SCALE = 1.25;
const POP_UP_MS = 110;

function useSavePop(saved: boolean) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const was = useRef(saved);
  useEffect(() => {
    // Only the change to saved pops: not the first render of a saved job, not unsaving.
    if (saved && !was.current && !reduceMotion) {
      scale.set(
        withSequence(
          withTiming(POP_SCALE, { duration: POP_UP_MS, easing: Easing.out(Easing.quad) }),
          withSpring(1, motion.spring),
        ),
      );
    }
    was.current = saved;
  }, [saved, reduceMotion, scale]);
  return useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
}

/** Website SaveJobButton. Labels: "Save job" / "Remove from saved jobs" (icon), "Save job" / "Saved" (button). */
export function SaveButton({ testID, saved, onPress, variant = 'icon', size = 'lg' }: Props) {
  // D32: the one accent for interactive state; a light haptic when the bookmark lands.
  const tint = saved ? colors.brand : colors.mutedForeground;
  const pop = useSavePop(saved);

  if (variant === 'button') {
    return (
      <PressableScale
        testID={testID}
        accessibilityLabel={saved ? 'Saved' : 'Save job'}
        accessibilityState={{ selected: saved }}
        haptic="light"
        onPress={onPress}
        style={[styles.button, size === 'md' && styles.buttonMd, saved && styles.buttonSaved]}
      >
        <Animated.View testID={`${testID}.icon`} style={pop}>
          <Icon name={bookmark(saved)} tintColor={tint} size={16} />
        </Animated.View>
        <AppText variant="label" color={saved ? 'brand' : 'foreground'}>
          {saved ? 'Saved' : 'Save job'}
        </AppText>
      </PressableScale>
    );
  }

  return (
    <PressableScale
      testID={testID}
      accessibilityLabel={saved ? 'Remove from saved jobs' : 'Save job'}
      accessibilityState={{ selected: saved }}
      haptic="light"
      pressScale={0.9}
      onPress={onPress}
      style={styles.icon}
    >
      <Animated.View testID={`${testID}.icon`} style={pop}>
        <Icon name={bookmark(saved)} tintColor={tint} size={22} />
      </Animated.View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  icon: {
    width: MIN_TOUCH - 4,
    height: MIN_TOUCH - 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  button: {
    minHeight: MIN_TOUCH,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing['2'],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: spacing['4'],
  },
  buttonMd: { minHeight: 44, paddingHorizontal: spacing['3'] },
  buttonSaved: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
});
