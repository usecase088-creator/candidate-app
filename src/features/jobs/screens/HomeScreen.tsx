import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/Text';
import { colors, radius, spacing } from '@/theme/tokens';

import { CategoryChips } from '../components/CategoryChips';
import { JobList } from '../components/JobList';
import { JobListSkeleton } from '../components/JobCardSkeleton';
import { QueryStatus } from '../components/QueryStatus';
import { RecommendedRail } from '../components/RecommendedRail';
import { useFilterStore } from '../filterStore';
import { useJobs, useMatchProfile, useRecommended } from '../hooks/useJobsData';
import { queryView } from '../hooks/queryView';
import { useSavedIdSet, useToggleSave } from '../hooks/useSavedJobs';
import { applyFilters, categoriesOf, DEFAULT_FILTERS } from '../logic/filter';
import { useOpenJob } from '../useOpenJob';

/**
 * Home (website "Opportunities"): headline, search entry, recommended rail, categories, and every job, newest first.
 * Search text, city and filters live on the Search tab (same store, so they stay when switching tabs).
 */
export function HomeScreen() {
  const router = useRouter();
  const openJob = useOpenJob();
  const jobsQuery = useJobs();
  const profileQuery = useMatchProfile();
  const savedIds = useSavedIdSet();
  const { toggle } = useToggleSave();
  const category = useFilterStore((s) => s.category);
  const setCategory = useFilterStore((s) => s.setCategory);

  const jobs = jobsQuery.data;
  const view = queryView(jobsQuery);
  const recommended = useRecommended(jobs);
  const categories = useMemo(() => categoriesOf(jobs ?? []), [jobs]);
  const visible = useMemo(
    () => applyFilters(jobs ?? [], { ...DEFAULT_FILTERS, query: '', city: '', category }),
    [jobs, category],
  );

  const profile = profileQuery.data;
  const showPrompt = !profileQuery.isPending && !(profile && profile.completeness >= 20);

  const header = (
    <View style={styles.header}>
      <AppText variant="title" accessibilityRole="header">
        Your next clinical role, curated for you.
      </AppText>
      <AppText color="mutedForeground">
        Browse verified healthcare openings across India — salary disclosed, credentials checked.
      </AppText>

      <Pressable
        testID="home.search"
        accessibilityRole="search"
        accessibilityLabel="Search jobs by role, specialty or city"
        onPress={() => router.navigate('/search')}
        style={styles.searchBar}
      >
        <AppText color="mutedForeground">Role or specialty, city or state</AppText>
      </Pressable>

      <View style={styles.links}>
        <Button
          testID="home.link.saved"
          label="Saved jobs"
          variant="outline"
          fullWidth={false}
          onPress={() => router.push('/saved-jobs')}
        />
        <Button
          testID="home.link.gov"
          label="Govt Jobs"
          variant="outline"
          fullWidth={false}
          onPress={() => router.push('/gov-jobs')}
        />
        <Button
          testID="home.link.intl"
          label="International Jobs"
          variant="outline"
          fullWidth={false}
          onPress={() => router.push('/intl-jobs')}
        />
      </View>

      {view === 'ready' && (
        <>
          <RecommendedRail jobs={recommended} showPrompt={showPrompt} onOpen={openJob} />
          <CategoryChips categories={categories} active={category} onChange={setCategory} />
          <View style={styles.listHeading}>
            <AppText variant="heading">All Opportunities</AppText>
            <AppText testID="home.count" variant="caption" color="mutedForeground">
              {`Showing ${visible.length} of ${jobs?.length ?? 0} verified roles`}
            </AppText>
          </View>
        </>
      )}
    </View>
  );

  const footer =
    view !== 'ready' ? (
      <QueryStatus
        view={view}
        testID="home"
        error={jobsQuery.error}
        onRetry={() => void jobsQuery.refetch()}
        retrying={jobsQuery.isFetching}
        skeleton={<JobListSkeleton testID="home.loading" />}
      />
    ) : visible.length === 0 ? (
      <EmptyState
        testID="home.empty"
        title={(jobs?.length ?? 0) === 0 ? 'No open positions yet' : 'No matches'}
        message={
          (jobs?.length ?? 0) === 0
            ? 'Hospitals post roles from the recruiter portal. Check back soon or widen your search.'
            : 'Try clearing filters or searching for a different role.'
        }
      />
    ) : null;

  return (
    <Screen testID="home.screen" edges={[]} padded={false}>
      <JobList
        testID="home.list"
        jobs={view === 'ready' ? visible : []}
        savedIds={savedIds}
        onToggleSave={toggle}
        onOpen={openJob}
        header={header}
        footer={footer}
        refreshing={jobsQuery.isRefetching}
        onRefresh={() => void Promise.all([jobsQuery.refetch(), profileQuery.refetch()])}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing['4'], marginBottom: spacing['4'] },
  searchBar: {
    minHeight: 48,
    justifyContent: 'center',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing['4'],
  },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing['2'] },
  listHeading: { gap: spacing['1'] },
});
