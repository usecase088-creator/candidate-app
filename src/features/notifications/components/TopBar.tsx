import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/Text';
import { colors, spacing } from '@/theme/tokens';

import { Button } from '@/components/ui/Button';
import { goToSignIn } from '@/features/auth/signInGate';
import { useIsSignedIn } from '@/features/auth/sessionStore';

import { NotificationBell } from './NotificationBell';

/**
 * Top bar of the four tabs (D32: one slim bar, 44 pt + the top inset). Home shows the wordmark; the other tabs show
 * their title here, so no tab repeats a big title inside its content. On the right the notification bell, or a Sign in
 * button for a visitor who is not signed in (website Navbar).
 */
export function TopBar({ title }: { title?: string }) {
  const insets = useSafeAreaInsets();
  const signedIn = useIsSignedIn();
  return (
    <View testID="topbar" style={[styles.bar, { paddingTop: insets.top }]}>
      {title ? (
        <AppText testID="topbar.title" variant="heading" numberOfLines={1} style={styles.brand}>
          {title}
        </AppText>
      ) : (
        <AppText
          testID="topbar.brand"
          weight="bold"
          color="primary"
          numberOfLines={1}
          maxFontSizeMultiplier={1.5}
          style={[styles.brand, styles.wordmark]}
        >
          ApronHanger
        </AppText>
      )}
      {signedIn ? (
        <NotificationBell />
      ) : (
        <Button
          testID="topbar.signin"
          label="Sign in"
          accessibilityLabel="Sign in"
          variant="secondary"
          size="sm"
          fullWidth={false}
          // Brand and button share 320 pt at font scale 2: the label grows at most 1.3 times.
          maxFontSizeMultiplier={1.3}
          onPress={() => goToSignIn()}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing['4'],
    paddingRight: spacing['2'],
    minHeight: 44,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  brand: { flex: 1 },
  wordmark: { fontSize: 17, lineHeight: 22, letterSpacing: -0.3 },
});
