// "My Applications" (website: routes/applications.tsx): title, count, the nine tabs with counts, one card per
// application. Loading, error, offline and empty states are the app's own (the website only has an error state here).
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
import { colors, radius, spacing } from '@/theme/tokens';

import { ApplicationCard } from '../components/ApplicationCard';
import { useApplications } from '../hooks/useApplications';
import { formatFetchedTime } from '../logic/interview';
import { countByTab, inTab, TABS, type Tab } from '../logic/status';

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
      <AppText variant="title" accessibilityRole="header">
        My Applications
      </AppText>
      {view === 'ready' && (
        <>
          <AppText testID="applications.count" color="mutedForeground">
            {`${all.length} application${all.length !== 1 ? 's' : ''}${fetched}`}
          </AppText>
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
      <QueryStatus
        view={view}
        testID="applications"
        error={query.error}
        onRetry={() => void query.refetch()}
        retrying={query.isFetching}
        skeleton={<ApplicationListSkeleton testID="applications.loading" />}
      />
    ) : list.length === 0 ? (
      <EmptyState
        testID="applications.empty"
        title="No applications yet"
        message="Start applying to opportunities and track your progress here."
        action={{ label: 'Browse opportunities', onPress: () => router.navigate('/') }}
      />
    ) : null;

  return (
    <Screen testID="applications.screen" edges={['top']} padded={false}>
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
        contentContainerStyle={styles.content}
      />
    </Screen>
  );
}

function ApplicationListSkeleton({ testID }: { testID: string }) {
  return (
    <View testID={testID} style={styles.skeletons}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.skeleton}>
          <View style={styles.skeletonTop}>
            <Skeleton width={44} height={44} radius={radius.lg} />
            <View style={styles.skeletonLines}>
              <Skeleton width="65%" height={14} />
              <Skeleton width="45%" height={12} />
            </View>
          </View>
          <Skeleton width={110} height={24} radius={radius.full} />
          <Skeleton width="100%" height={24} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing['4'] },
  header: { gap: spacing['2'], marginBottom: spacing['4'] },
  tabs: { gap: spacing['2'], paddingVertical: spacing['1'] },
  skeletons: { gap: spacing['3'] },
  skeleton: {
    gap: spacing['3'],
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing['4'],
  },
  skeletonTop: { flexDirection: 'row', gap: spacing['3'] },
  skeletonLines: { flexGrow: 1, gap: spacing['2'] },
});
