import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { SearchField } from '@/components/ui/SearchField';
import { useIsSignedIn } from '@/features/auth/sessionStore';
import { goToSignIn } from '@/features/auth/signInGate';
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

type QuickLink = {
  testID: string;
  label: string;
  path: '/saved-jobs' | '/gov-jobs' | '/intl-jobs';
  icon:
    | { ios: 'bookmark'; android: 'bookmark' }
    | { ios: 'building.columns'; android: 'account_balance' }
    | { ios: 'globe'; android: 'public' };
};

const QUICK_LINKS: QuickLink[] = [
  {
    testID: 'home.link.saved',
    label: 'Saved jobs',
    path: '/saved-jobs',
    icon: { ios: 'bookmark', android: 'bookmark' },
  },
  {
    testID: 'home.link.gov',
    label: 'Govt Jobs',
    path: '/gov-jobs',
    icon: { ios: 'building.columns', android: 'account_balance' },
  },
  {
    testID: 'home.link.intl',
    label: 'International Jobs',
    path: '/intl-jobs',
    icon: { ios: 'globe', android: 'public' },
  },
];

/**
 * Home (website "Opportunities"). D32: the headline is one compact line pair, the search field comes first, the three
 * destinations are a row of tiles, the recommended rail bleeds to the edges, and the jobs are rows (JobRow).
 * Search text, city and filters live on the Search tab (same store, so they stay when switching tabs).
 */
export function HomeScreen() {
  const router = useRouter();
  const signedIn = useIsSignedIn();
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
    <View>
      <View style={styles.hero}>
        <AppText variant="title" accessibilityRole="header">
          Your next clinical role, curated for you.
        </AppText>
        <AppText variant="secondary" color="mutedForeground">
          Browse verified healthcare openings across India — salary disclosed, credentials checked.
        </AppText>
        <SearchField
          testID="home.search"
          accessibilityLabel="Search jobs by role, specialty or city"
          placeholder="Role or specialty, city or state"
          onPress={() => router.navigate('/search')}
        />
        <View style={styles.tiles}>
          {QUICK_LINKS.map((link) => (
            <PressableScale
              key={link.testID}
              testID={link.testID}
              accessibilityLabel={link.label}
              onPress={() => (signedIn ? router.push(link.path) : goToSignIn(link.path))}
              style={styles.tile}
            >
              <Icon name={{ ...link.icon, web: link.icon.android }} tintColor={colors.brand} size={22} />
              <AppText variant="label" numberOfLines={2} align="center">
                {link.label}
              </AppText>
            </PressableScale>
          ))}
        </View>
      </View>

      {view === 'ready' && (
        <>
          {signedIn && <RecommendedRail jobs={recommended} showPrompt={showPrompt} onOpen={openJob} />}
          <View style={styles.chips}>
            <CategoryChips
              categories={categories}
              active={category}
              // Website: picking a category needs an account ("All Roles" has nothing to filter, so it stays open).
              onChange={(c) => (signedIn || c === null ? setCategory(c) : goToSignIn('/'))}
            />
          </View>
          <View style={styles.listHeading}>
            <AppText variant="heading" style={styles.flex}>
              All Opportunities
            </AppText>
            <AppText testID="home.count" variant="secondary" color="mutedForeground" numberOfLines={1}>
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
        onRefresh={() =>
          void Promise.all([jobsQuery.refetch(), signedIn ? profileQuery.refetch() : undefined])
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing['3'], paddingHorizontal: spacing['4'], paddingTop: spacing['4'] },
  tiles: { flexDirection: 'row', gap: spacing['2'], marginTop: spacing['1'] },
  tile: {
    flex: 1,
    minHeight: 72,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing['1'],
    paddingHorizontal: spacing['2'],
    paddingVertical: spacing['2'],
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
  },
  chips: { paddingHorizontal: spacing['4'], paddingTop: spacing['4'] },
  listHeading: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing['3'],
    paddingHorizontal: spacing['4'],
    paddingTop: spacing['5'],
    paddingBottom: spacing['2'],
  },
  flex: { flex: 1 },
});
