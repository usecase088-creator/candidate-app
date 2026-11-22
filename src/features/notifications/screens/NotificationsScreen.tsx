// Website NotificationsMenu as a screen: newest 50, unread marked, tap to read and open. Push (Phase 4) opens the
// same screens through src/lib/linking.ts. D32: flat 72-pt rows, "{n} unread" + "Mark all as read" header, pull to
// refresh, row skeletons while loading.
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import type { AppNotification } from '@/api/schemas/notifications';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Screen } from '@/components/ui/Screen';
import { Separator } from '@/components/ui/Separator';
import { ListRowSkeleton } from '@/components/ui/SkeletonPresets';
import { AppText } from '@/components/ui/Text';
import { TextButton } from '@/components/ui/TextButton';
import { queryView } from '@/features/jobs/hooks/queryView';
import { resolveLink } from '@/lib/linking';
import { colors, spacing } from '@/theme/tokens';

import { NOTIFICATION_ROW_INSET, NotificationRow } from '../components/NotificationRow';
import { useMarkAllRead, useMarkRead, useNotifications } from '../hooks/useNotifications';

const EMPTY_ICON = { ios: 'bell.slash', android: 'notifications_off', web: 'notifications_off' } as const;

export function NotificationsScreen() {
  const router = useRouter();
  const query = useNotifications();
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const view = queryView(query);
  const items = query.data?.data ?? [];
  const unread = query.data?.unreadCount ?? 0;
  // Pull to refresh shows its own spinner; background refetches never do.
  const [refreshing, setRefreshing] = useState(false);

  const open = (n: AppNotification) => {
    if (!n.read) markRead.mutate(n.id);
    const route = resolveLink(n.link);
    if (route) router.push(route as never);
  };

  async function refresh() {
    setRefreshing(true);
    await query.refetch();
    setRefreshing(false);
  }

  return (
    <Screen testID="notifications.screen" padded={false}>
      {view === 'loading' && <ListRowSkeleton testID="notifications.loading" count={6} />}
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
          icon={EMPTY_ICON}
          title="No notifications yet"
          message="Updates on applications and saved roles will appear here."
        />
      )}
      {view === 'ready' && items.length > 0 && (
        <FlatList
          testID="notifications.list"
          data={items}
          keyExtractor={(n) => n.id}
          renderItem={({ item }) => <NotificationRow item={item} onPress={() => open(item)} />}
          ItemSeparatorComponent={() => <Separator inset={NOTIFICATION_ROW_INSET} />}
          ListHeaderComponent={
            <View testID="notifications.actions" style={styles.actions}>
              <AppText testID="notifications.unread" variant="secondary" color="mutedForeground" tabular>
                {`${unread} unread`}
              </AppText>
              {unread > 0 && (
                <TextButton
                  testID="notifications.readAll"
                  label="Mark all as read"
                  disabled={markAll.isPending}
                  onPress={() => markAll.mutate()}
                />
              )}
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void refresh()}
              tintColor={colors.brand}
              colors={[colors.brand]}
            />
          }
          contentContainerStyle={styles.list}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: spacing['8'] },
  // Wraps at large text sizes: "Mark all as read" goes under the count instead of off the screen.
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing['2'],
    paddingHorizontal: spacing['4'],
    paddingTop: spacing['2'],
  },
});
