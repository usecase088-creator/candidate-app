import { useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/Text';
import { TextInput } from '@/components/ui/TextInput';
import { colors, radius, spacing } from '@/theme/tokens';

import { FilterSheet } from '../components/FilterSheet';
import { JobListSkeleton } from '../components/JobCardSkeleton';
import { JobList } from '../components/JobList';
import { QueryStatus } from '../components/QueryStatus';
import { selectFilterState, useFilterStore } from '../filterStore';
import { queryView } from '../hooks/queryView';
import { useJobs } from '../hooks/useJobsData';
import { useSavedIdSet, useToggleSave } from '../hooks/useSavedJobs';
import { activeFilterCount, applyFilters, citiesOf } from '../logic/filter';
import { useOpenJob } from '../useOpenJob';

/**
 * Search tab: the website's search fields, filter panel and sort for the job list. Everything is filtered on the
 * device, live; the server sends up to 50 jobs and the app shows what the website shows. State lives in the filter
 * store, so it stays when the user changes tab.
 */
export function SearchScreen() {
  const openJob = useOpenJob();
  const jobsQuery = useJobs();
  const savedIds = useSavedIdSet();
  const { toggle } = useToggleSave();
  const [sheetOpen, setSheetOpen] = useState(false);

  const filterState = useFilterStore(useShallow(selectFilterState));
  const setQuery = useFilterStore((s) => s.setQuery);
  const setCity = useFilterStore((s) => s.setCity);
  const setCategory = useFilterStore((s) => s.setCategory);

  const jobs = jobsQuery.data;
  const view = queryView(jobsQuery);
  const visible = useMemo(() => applyFilters(jobs ?? [], filterState), [jobs, filterState]);
  const cities = useMemo(() => citiesOf(jobs ?? []), [jobs]);
  const active = activeFilterCount(filterState);
  const total = jobs?.length ?? 0;

  const header = (
    <View style={styles.header}>
      <TextInput
        testID="search.query"
        label="Role or specialty"
        placeholder="Role or specialty"
        value={filterState.query}
        onChangeText={setQuery}
        returnKeyType="next"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TextInput
        testID="search.city"
        label="City or state"
        placeholder="City or state"
        value={filterState.city}
        onChangeText={setCity}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <View style={styles.toolbar}>
        <Button
          testID="search.filters"
          label={active > 0 ? `Filters (${active})` : 'Filters'}
          accessibilityLabel={active > 0 ? `Filters, ${active} active` : 'Filters'}
          variant="outline"
          fullWidth={false}
          onPress={() => setSheetOpen(true)}
        />
        {filterState.category ? (
          <Pressable
            testID="search.category"
            accessibilityRole="button"
            accessibilityLabel={`${filterState.category}, tap to remove`}
            onPress={() => setCategory(null)}
            style={styles.categoryChip}
          >
            <AppText variant="caption" weight="semibold" color="primaryForeground">
              {filterState.category}
            </AppText>
            <AppText variant="caption" weight="semibold" color="primaryForeground">
              ✕
            </AppText>
          </Pressable>
        ) : null}
      </View>

      {view === 'ready' && (
        <View style={styles.heading}>
          <AppText variant="heading">All Opportunities</AppText>
          <AppText testID="search.count" variant="caption" color="mutedForeground">
            {`Showing ${visible.length} of ${total} verified roles`}
          </AppText>
        </View>
      )}
    </View>
  );

  const footer =
    view !== 'ready' ? (
      <QueryStatus
        view={view}
        testID="search"
        error={jobsQuery.error}
        onRetry={() => void jobsQuery.refetch()}
        retrying={jobsQuery.isFetching}
        skeleton={<JobListSkeleton testID="search.loading" />}
      />
    ) : visible.length === 0 ? (
      <EmptyState
        testID="search.empty"
        title={total === 0 ? 'No open positions yet' : 'No matches'}
        message={
          total === 0
            ? 'Hospitals post roles from the recruiter portal. Check back soon or widen your search.'
            : 'Try clearing filters or searching for a different role.'
        }
      />
    ) : null;

  return (
    <Screen testID="search.screen" edges={[]} padded={false}>
      <JobList
        testID="search.list"
        jobs={view === 'ready' ? visible : []}
        savedIds={savedIds}
        onToggleSave={toggle}
        onOpen={openJob}
        header={header}
        footer={footer}
        refreshing={jobsQuery.isRefetching}
        onRefresh={() => void jobsQuery.refetch()}
      />
      <FilterSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        cities={cities}
        resultCount={visible.length}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing['4'], marginBottom: spacing['4'] },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing['2'] },
  categoryChip: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2'],
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing['4'],
  },
  heading: { gap: spacing['1'] },
});
