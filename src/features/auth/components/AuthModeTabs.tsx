import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/Text';
import { colors, MIN_TOUCH, radius, shadows, spacing } from '@/theme/tokens';

type Mode = 'signin' | 'signup';

/** Website auth.tsx mode tabs: "Sign In" | "Create Account" (+ "New" badge). Separate routes in the app. */
export function AuthModeTabs({ active }: { active: Mode }) {
  const tab = (mode: Mode, label: string, href: '/login' | '/signup') => {
    const selected = mode === active;
    return (
      <Pressable
        testID={`auth.tab.${mode}`}
        accessibilityRole="tab"
        accessibilityLabel={label}
        accessibilityState={{ selected }}
        onPress={() => !selected && router.replace(href)}
        style={[styles.tab, selected && styles.selected]}
      >
        <AppText variant="label" weight="semibold" color={selected ? 'foreground' : 'mutedForeground'}>
          {label}
        </AppText>
        {mode === 'signup' && (
          <View style={styles.badge}>
            <AppText variant="caption" weight="semibold" color="brand">
              New
            </AppText>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View accessibilityRole="tablist" style={styles.bar}>
      {tab('signin', 'Sign In', '/login')}
      {tab('signup', 'Create Account', '/signup')}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.muted,
    borderRadius: radius.xl,
    padding: spacing['1'],
    gap: spacing['1'],
  },
  tab: {
    flex: 1,
    minHeight: MIN_TOUCH - spacing['2'],
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing['2'],
    paddingHorizontal: spacing['2'],
  },
  selected: { backgroundColor: colors.surface, boxShadow: shadows.soft },
  badge: {
    backgroundColor: colors.brandSoft,
    borderRadius: radius.full,
    paddingHorizontal: spacing['2'],
  },
});
