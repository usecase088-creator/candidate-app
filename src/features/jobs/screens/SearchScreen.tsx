import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { SearchField } from '@/components/ui/SearchField';
import { AppText } from '@/components/ui/Text';
import { spacing } from '@/theme/tokens';

import { useIsSignedIn } from '@/features/auth/sessionStore';
import { goToSignIn } from '@/features/auth/signInGate';

import { JobListSkeleton } from '../components/JobCardSkeleton';
import { JobList } from '../components/JobList';
import { QueryStatus } from '../components/QueryStatus';
import { selectFilterState, useFilterStore } from '../filterStore';
import { queryView } from '../hooks/queryView';
import { useJobs } from '../hooks/useJobsData';
import { useSavedIdSet, useToggleSave } from '../hooks/useSavedJobs';
import { activeFilterCount, applyFilters } from '../logic/filter';
import { useOpenJob } from '../useOpenJob';

/**
 * Search tab: the website's search fields, filter panel and sort for the job list. Everything is filtered on the
 * device, live; the server sends up to 50 jobs and the app shows what the website shows. State lives in the filter
 * store, so it stays when the user changes tab.
 */
export function SearchScreen() {
  const signedIn = useIsSignedIn();
  const openJob = useOpenJob();
  const jobsQuery = useJobs();
  const savedIds = useSavedIdSet();
  const { toggle } = useToggleSave();
  const router = useRouter();

  const filterState = useFilterStore(useShallow(selectFilterState));
  const setQuery = useFilterStore((s) => s.setQuery);
  const setCity = useFilterStore((s) => s.setCity);
  const setCategory = useFilterStore((s) => s.setCategory);

  const jobs = jobsQuery.data;
  const view = queryView(jobsQuery);
  const visible = useMemo(() => applyFilters(jobs ?? [], filterState), [jobs, filterState]);
  const active = activeFilterCount(filterState);
  const total = jobs?.length ?? 0;

  // D32: two compact search fields (role, then city), a small Filters button with its count, the category as a
  // removable chip, then the results heading with the count on one line.
  const header = (
    <View style={styles.header}>
      <SearchField
        testID="search.query"
        accessibilityLabel="Role or specialty"
        placeholder="Role or specialty"
        value={filterState.query}
        onChangeText={setQuery}
        returnKeyType="next"
      />
      <SearchField
        testID="search.city"
        accessibilityLabel="City or state"
        placeholder="City or state"
        icon={{ ios: 'mappin.and.ellipse', android: 'location_on' }}
        value={filterState.city}
        onChangeText={setCity}
      />

      <View style={styles.toolbar}>
        <Button
          testID="search.filters"
          label={active > 0 ? `Filters (${active})` : 'Filters'}
          accessibilityLabel={active > 0 ? `Filters, ${active} active` : 'Filters'}
          variant="secondary"
          size="sm"
          fullWidth={false}
          icon={{ ios: 'line.3.horizontal.decrease', android: 'tune' }}
          // Website: filters need an account (a guest is sent to sign-in and comes back here).
          onPress={() => (signedIn ? router.push('/filters') : goToSignIn('/search'))}
        />
        {filterState.category ? (
          <Chip
            testID="search.category"
            label={filterState.category}
            accessibilityLabel={`${filterState.category}, tap to remove`}
            selected
            onPress={() => setCategory(null)}
            onRemove={() => setCategory(null)}
          />
        ) : null}
      </View>

      {view === 'ready' && (
        <View style={styles.heading}>
          <AppText variant="heading" style={styles.flex}>
            All Opportunities
          </AppText>
          <AppText testID="search.count" variant="secondary" color="mutedForeground" numberOfLines={1}>
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing['3'], paddingHorizontal: spacing['4'], paddingTop: spacing['4'] },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing['2'] },
  heading: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing['3'],
    paddingTop: spacing['2'],
    paddingBottom: spacing['1'],
  },
  flex: { flex: 1 },
});
