import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { AppText } from '@/components/ui/Text';
import { colors, MIN_TOUCH, radius, spacing } from '@/theme/tokens';

import { useUnreadCount } from '../hooks/useNotifications';

const BADGE = 18;

/** The bell in the top bar (website Navbar): unread count on a brand badge (D32), opens the notifications list. */
export function NotificationBell() {
  const router = useRouter();
  const unread = useUnreadCount() ?? 0;
  const count = unread > 99 ? '99+' : String(unread);
  return (
    <PressableScale
      testID="topbar.notifications"
      accessibilityLabel={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
      hitSlop={4}
      onPress={() => router.push('/notifications')}
      style={styles.button}
    >
      <Icon
        name={{ ios: 'bell', android: 'notifications', web: 'notifications' }}
        tintColor={colors.foreground}
        size={24}
      />
      {unread > 0 ? (
        <View testID="topbar.notifications.badge" style={styles.badge} accessible={false}>
          <AppText
            testID="topbar.notifications.count"
            variant="caption"
            weight="semibold"
            color="brandForeground"
            maxFontSizeMultiplier={1}
            numberOfLines={1}
          >
            {count}
          </AppText>
        </View>
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: MIN_TOUCH,
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  badge: {
    position: 'absolute',
    top: spacing['1'],
    right: spacing['1'],
    minWidth: BADGE,
    height: BADGE,
    paddingHorizontal: spacing['1'],
    borderRadius: radius.full,
    backgroundColor: colors.brand,
    borderWidth: 1.5,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
