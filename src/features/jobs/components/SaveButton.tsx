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
import { colors, ICON_BUTTON, MIN_TOUCH, motion, radius, spacing, touchSlop } from '@/theme/tokens';

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

/** Saved is drawn by shape on both platforms (R3 a11y P2-15: Android was tint only). */
export const bookmarkIcon = (saved: boolean) =>
  ({
    ios: saved ? 'bookmark.fill' : 'bookmark',
    android: saved ? 'bookmark_added' : 'bookmark',
    web: saved ? 'bookmark_added' : 'bookmark',
  }) as const;

/** R2 signature touch 3: the bookmark pops (1 -> 1.25 -> 1, about 260 ms) when it becomes saved. */
const POP_SCALE = 1.25;
const POP_UP_MS = 110;
const ICON_BOX = ICON_BUTTON;

/**
 * R3 #2: only the user's own save pops. A press on an unsaved bookmark arms the pop for that job (testID); it runs
 * when `saved` turns true for the same job. The saved list arriving, a recycled list cell showing another (saved)
 * job, or a save from elsewhere never pop.
 */
function useSavePop(testID: string, saved: boolean) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const armed = useRef<string | null>(null);
  useEffect(() => {
    if (saved && armed.current === testID && !reduceMotion) {
      scale.set(
        withSequence(
          withTiming(POP_SCALE, { duration: POP_UP_MS, easing: Easing.out(Easing.quad) }),
          withSpring(1, motion.spring),
        ),
      );
    }
    if (saved || armed.current !== testID) armed.current = null;
  }, [saved, testID, reduceMotion, scale]);
  const arm = () => {
    armed.current = saved ? null : testID;
  };
  return { arm, style: useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] })) };
}

/** Website SaveJobButton. Labels: "Save job" / "Remove from saved jobs" (icon), "Save job" / "Saved" (button). */
export function SaveButton({ testID, saved, onPress, variant = 'icon', size = 'lg' }: Props) {
  // D32: the one accent for interactive state; a light haptic when the bookmark lands.
  const tint = saved ? colors.brand : colors.mutedForeground;
  const { arm, style: pop } = useSavePop(testID, saved);
  const press = () => {
    arm();
    onPress();
  };

  if (variant === 'button') {
    return (
      <PressableScale
        testID={testID}
        accessibilityLabel={saved ? 'Saved' : 'Save job'}
        accessibilityState={{ selected: saved }}
        haptic="light"
        onPress={press}
        style={[styles.button, size === 'md' && styles.buttonMd, saved && styles.buttonSaved]}
      >
        <Animated.View testID={`${testID}.icon`} style={pop}>
          <Icon name={bookmarkIcon(saved)} tintColor={tint} size={16} />
        </Animated.View>
        <AppText variant="label" color={saved ? 'brandText' : 'foreground'}>
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
      hitSlop={touchSlop(ICON_BOX)}
      onPress={press}
      style={styles.icon}
    >
      <Animated.View testID={`${testID}.icon`} style={pop}>
        <Icon name={bookmarkIcon(saved)} tintColor={tint} size={22} />
      </Animated.View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  icon: {
    width: ICON_BOX,
    height: ICON_BOX,
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
