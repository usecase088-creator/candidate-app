// "My Applications" (website: routes/applications.tsx): count, the nine tabs with counts, one card per application.
// The title is drawn by the TopBar (D32). Loading, error, offline and empty states are the app's own (the website
// only has an error state here). The list stays in the server's order, newest first: a fresh application must be
// the first row after Quick Apply (see APPLICATIONS_LIST_PROPS), so "needs you" is said by the amber pill and the
// action row, not by the order.
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { AppText } from '@/components/ui/Text';
import { QueryStatus } from '@/features/jobs/components/QueryStatus';
import { queryView } from '@/features/jobs/hooks/queryView';
import { colors, radius, shadows, spacing } from '@/theme/tokens';

import { ApplicationCard } from '../components/ApplicationCard';
import { useApplications } from '../hooks/useApplications';
import { formatFetchedTime } from '../logic/interview';
import { countByTab, inTab, TABS, type Tab } from '../logic/status';

/**
 * A new application is added at the top. FlashList would keep the old rows where they were and push the new one out of
 * sight (found on the phone after Quick Apply), so this list does not hold its position.
 */
export const APPLICATIONS_LIST_PROPS = { maintainVisibleContentPosition: { disabled: true } } as const;

const slug = (tab: Tab) => tab.toLowerCase().replace(/\s+/g, '-');

export function ApplicationsScreen() {
  const router = useRouter();
  const query = useApplications();
  const view = queryView(query);
  const [tab, setTab] = useState<Tab>('All');

  const all = useMemo(() => query.data ?? [], [query.data]);
  const counts = useMemo(() => countByTab(all), [all]);
  const list = useMemo(() => all.filter((a) => inTab(a.status, tab)), [all, tab]);
  const fetched = query.dataUpdatedAt
    ? ` · fetched at ${formatFetchedTime(new Date(query.dataUpdatedAt))}`
    : '';

  const header = (
    <View style={styles.header}>
      {view === 'ready' && (
        <>
          <AppText
            testID="applications.count"
            variant="secondary"
            color="mutedForeground"
            tabular
            style={styles.count}
          >
            {`${all.length} application${all.length !== 1 ? 's' : ''}`}
            {/* Website wording, kept; D32 round 2 sets it as a 12-pt muted timestamp, not a second sentence. */}
            {fetched ? (
              <AppText
                testID="applications.fetched"
                variant="caption"
                weight="regular"
                color="mutedForeground"
              >
                {fetched}
              </AppText>
            ) : null}
          </AppText>
          {/* The chip row bleeds edge to edge; the 16-pt margin lives inside the scroll content. */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
            {TABS.map((t) => (
              <Chip
                key={t}
                testID={`applications.tab.${slug(t)}`}
                label={`${t} ${counts[t]}`}
                accessibilityLabel={`${t}, ${counts[t]}`}
                selected={tab === t}
                onPress={() => setTab(t)}
              />
            ))}
          </ScrollView>
        </>
      )}
    </View>
  );

  const footer =
    view !== 'ready' ? (
      <View style={view === 'loading' ? undefined : styles.inset}>
        <QueryStatus
          view={view}
          testID="applications"
          error={query.error}
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
          skeleton={<ApplicationListSkeleton testID="applications.loading" />}
        />
      </View>
    ) : list.length === 0 ? (
      <View style={styles.inset}>
        <EmptyState
          testID="applications.empty"
          title="No applications yet"
          message="Start applying to opportunities and track your progress here."
          action={{ label: 'Browse opportunities', onPress: () => router.navigate('/') }}
        />
      </View>
    ) : null;

  return (
    <Screen testID="applications.screen" edges={[]} padded={false}>
      <FlashList
        testID="applications.list"
        data={view === 'ready' ? list : []}
        keyExtractor={(a) => a.id}
        renderItem={({ item }) => (
          <ApplicationCard
            application={item}
            onPress={() => router.push({ pathname: '/application/[id]', params: { id: item.id } })}
          />
        )}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        refreshing={query.isRefetching}
        onRefresh={() => void query.refetch()}
        keyboardShouldPersistTaps="handled"
        {...APPLICATIONS_LIST_PROPS}
        contentContainerStyle={styles.content}
      />
    </Screen>
  );
}

/** Three card-shaped placeholders (logo, two lines, pill, bar) so the list does not jump when the rows land. */
function ApplicationListSkeleton({ testID }: { testID: string }) {
  return (
    <View testID={testID} accessible accessibilityLabel="Loading" accessibilityRole="progressbar">
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.skeleton}>
          <View style={styles.skeletonTop}>
            <Skeleton width={40} height={40} radius={radius.sm} />
            <View style={styles.skeletonLines}>
              <Skeleton width="65%" height={16} />
              <Skeleton width="45%" height={13} />
              <Skeleton width="35%" height={13} />
            </View>
          </View>
          <Skeleton width={96} height={22} radius={radius.full} />
          <Skeleton width="100%" height={4} radius={radius.full} />
          <Skeleton width="55%" height={13} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing['3'], paddingBottom: spacing['4'] },
  header: { gap: spacing['2'], marginBottom: spacing['3'] },
  count: { paddingHorizontal: spacing['4'] },
  tabs: { gap: spacing['2'], paddingHorizontal: spacing['4'], paddingVertical: spacing['1'] },
  inset: { paddingHorizontal: spacing['4'] },
  skeleton: {
    gap: spacing['3'],
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    boxShadow: shadows.soft,
    padding: spacing['4'],
    marginHorizontal: spacing['4'],
    marginBottom: spacing['3'],
  },
  skeletonTop: { flexDirection: 'row', gap: spacing['3'] },
  skeletonLines: { flexGrow: 1, gap: spacing['2'] },
});
