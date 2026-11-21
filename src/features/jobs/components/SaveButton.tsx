import { StyleSheet } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { AppText } from '@/components/ui/Text';
import { colors, MIN_TOUCH, radius, spacing } from '@/theme/tokens';

type Props = {
  /** `job.save.{jobId}` etc. */
  testID: string;
  saved: boolean;
  onPress: () => void;
  /** "icon": the bookmark on cards. "button": "Save job" / "Saved" on job details. */
  variant?: 'icon' | 'button';
};

const bookmark = (saved: boolean) =>
  ({ ios: saved ? 'bookmark.fill' : 'bookmark', android: 'bookmark', web: 'bookmark' }) as const;

/** Website SaveJobButton. Labels: "Save job" / "Remove from saved jobs" (icon), "Save job" / "Saved" (button). */
export function SaveButton({ testID, saved, onPress, variant = 'icon' }: Props) {
  // D32: the one accent for interactive state; a light haptic when the bookmark lands.
  const tint = saved ? colors.brand : colors.mutedForeground;

  if (variant === 'button') {
    return (
      <PressableScale
        testID={testID}
        accessibilityLabel={saved ? 'Saved' : 'Save job'}
        accessibilityState={{ selected: saved }}
        haptic="light"
        onPress={onPress}
        style={[styles.button, saved && styles.buttonSaved]}
      >
        <Icon name={bookmark(saved)} tintColor={tint} size={16} />
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
      <Icon name={bookmark(saved)} tintColor={tint} size={22} />
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
  buttonSaved: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
});
