import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';

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
  const tint = saved ? colors.primary : colors.mutedForeground;

  if (variant === 'button') {
    return (
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={saved ? 'Saved' : 'Save job'}
        accessibilityState={{ selected: saved }}
        onPress={onPress}
        style={[styles.button, saved && styles.buttonSaved]}
      >
        <SymbolView name={bookmark(saved)} tintColor={tint} size={16} />
        <AppText variant="label" weight="medium" color={saved ? 'primary' : 'foreground'}>
          {saved ? 'Saved' : 'Save job'}
        </AppText>
      </Pressable>
    );
  }

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={saved ? 'Remove from saved jobs' : 'Save job'}
      accessibilityState={{ selected: saved }}
      onPress={onPress}
      hitSlop={4}
      style={styles.icon}
    >
      <SymbolView name={bookmark(saved)} tintColor={tint} size={20} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  icon: { width: MIN_TOUCH - 4, height: MIN_TOUCH - 4, alignItems: 'center', justifyContent: 'center' },
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
  buttonSaved: { borderColor: colors.primary, backgroundColor: colors.secondary },
});
