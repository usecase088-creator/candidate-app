// Website NotificationsMenu as a screen: newest 50, unread marked, tap to read and open. Push (Phase 4) opens the
// same screens through src/lib/linking.ts.
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import type { AppNotification } from '@/api/schemas/notifications';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { AppText } from '@/components/ui/Text';
import { queryView } from '@/features/jobs/hooks/queryView';
import { resolveLink } from '@/lib/linking';
import { colors, MIN_TOUCH, radius, spacing } from '@/theme/tokens';

import { useMarkAllRead, useMarkRead, useNotifications } from '../hooks/useNotifications';

const when = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export function NotificationsScreen() {
  const router = useRouter();
  const query = useNotifications();
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const view = queryView(query);
  const items = query.data?.data ?? [];
  const unread = query.data?.unreadCount ?? 0;

  const open = (n: AppNotification) => {
    if (!n.read) markRead.mutate(n.id);
    const route = resolveLink(n.link);
    if (route) router.push(route as never);
  };

  return (
    <Screen testID="notifications.screen" scroll>
      <View style={styles.stack}>
        <Button
          testID="notifications.back"
          label="← Back"
          accessibilityLabel="Back"
          variant="ghost"
          fullWidth={false}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/profile'))}
        />
        <AppText variant="title" accessibilityRole="header">
          Notifications
        </AppText>
        {view === 'loading' && <Skeleton testID="notifications.loading" width="100%" height={72} />}
        {(view === 'error' || view === 'offline') && (
          <ErrorState
            testID="notifications.error"
            message={view === 'offline' ? "You're offline." : 'We could not load your notifications.'}
            onRetry={() => void query.refetch()}
            retrying={query.isFetching}
          />
        )}
        {view === 'ready' && items.length === 0 && (
          <EmptyState
            testID="notifications.empty"
            title="No notifications yet"
            message="Updates about your applications will show here."
          />
        )}
        {view === 'ready' && items.length > 0 && (
          <>
            <View style={styles.row}>
              <AppText testID="notifications.unread" color="mutedForeground">
                {`${unread} unread`}
              </AppText>
              {unread > 0 && (
                <Button
                  testID="notifications.readAll"
                  label="Mark all as read"
                  variant="ghost"
                  fullWidth={false}
                  loading={markAll.isPending}
                  onPress={() => markAll.mutate()}
                />
              )}
            </View>
            {items.map((n) => (
              <Pressable
                key={n.id}
                testID={`notifications.item.${n.id}`}
                accessibilityRole="button"
                accessibilityLabel={`${n.read ? '' : 'Unread. '}${n.title}. ${n.message}`}
                onPress={() => open(n)}
                style={[styles.card, !n.read && styles.unread]}
              >
                <View style={styles.row}>
                  <AppText weight={n.read ? 'medium' : 'semibold'} style={styles.title}>
                    {n.title}
                  </AppText>
                  <AppText variant="caption" color="mutedForeground">
                    {when(n.createdAt)}
                  </AppText>
                </View>
                <AppText color="mutedForeground">{n.message}</AppText>
              </Pressable>
            ))}
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing['3'] },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing['2'] },
  title: { flex: 1 },
  card: {
    minHeight: MIN_TOUCH,
    gap: spacing['1'],
    padding: spacing['3'],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  unread: { borderColor: colors.brand, backgroundColor: colors.background },
});
