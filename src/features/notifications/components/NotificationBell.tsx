import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/Text';
import { colors, MIN_TOUCH, radius, spacing } from '@/theme/tokens';

import { useUnreadCount } from '../hooks/useNotifications';

/** The bell in the top bar (website Navbar): unread count on it, opens the notifications list. */
export function NotificationBell() {
  const router = useRouter();
  const unread = useUnreadCount() ?? 0;
  const count = unread > 99 ? '99+' : String(unread);
  return (
    <Pressable
      testID="topbar.notifications"
      accessibilityRole="button"
      accessibilityLabel={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
      hitSlop={4}
      onPress={() => router.push('/notifications')}
      style={styles.button}
    >
      <SymbolView
        name={{ ios: 'bell', android: 'notifications', web: 'notifications' }}
        tintColor={colors.foreground}
        size={24}
      />
      {unread > 0 ? (
        <View style={styles.badge} accessible={false}>
          <AppText
            testID="topbar.notifications.count"
            variant="caption"
            weight="semibold"
            color="destructiveForeground"
            maxFontSizeMultiplier={1}
          >
            {count}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: spacing['1'],
    right: spacing['1'],
    minWidth: 18,
    paddingHorizontal: spacing['1'],
    borderRadius: radius.full,
    backgroundColor: colors.destructive,
    alignItems: 'center',
  },
});
