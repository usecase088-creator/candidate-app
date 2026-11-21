import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/Text';
import { TextButton } from '@/components/ui/TextButton';
import { spacing } from '@/theme/tokens';

import { JobListSkeleton } from '../components/JobCardSkeleton';
import { JobList } from '../components/JobList';
import { QueryStatus } from '../components/QueryStatus';
import { queryView } from '../hooks/queryView';
import { useSavedJobs, useToggleSave } from '../hooks/useSavedJobs';
import { useOpenJob } from '../useOpenJob';

/**
 * Website saved-jobs.tsx. The list is the saved-jobs cache, so unsaving a card removes it at once. D32 round 2: the
 * count and the browse link only above a list; with nothing saved the empty state says it (and has its own button).
 */
export function SavedJobsScreen() {
  const router = useRouter();
  const openJob = useOpenJob();
  const query = useSavedJobs();
  const { toggle } = useToggleSave();
  const view = queryView(query);

  const jobs = useMemo(() => (query.data ?? []).map((s) => s.job), [query.data]);
  const savedIds = useMemo(() => new Set(jobs.map((j) => j.id)), [jobs]);
  const browse = () => router.navigate('/');

  const header =
    view === 'ready' && jobs.length > 0 ? (
      <View style={styles.header}>
        <AppText testID="saved.count" color="mutedForeground">
          {`${jobs.length} role${jobs.length !== 1 ? 's' : ''} bookmarked for later`}
        </AppText>
        {/* A text link on the 16-pt margin (its touch target comes from hitSlop, not padding). */}
        <TextButton testID="saved.browse" label="Browse opportunities" onPress={browse} />
      </View>
    ) : (
      <View style={styles.spacer} />
    );

  const footer =
    view !== 'ready' ? (
      <QueryStatus
        view={view}
        testID="saved"
        error={query.error}
        onRetry={() => void query.refetch()}
        retrying={query.isFetching}
        skeleton={<JobListSkeleton testID="saved.loading" />}
      />
    ) : jobs.length === 0 ? (
      <EmptyState
        testID="saved.empty"
        title="No saved jobs yet"
        message="Tap the bookmark icon on any job to save it here."
        action={{ label: 'Find opportunities', onPress: browse }}
      />
    ) : null;

  return (
    <Screen testID="saved.screen" padded={false}>
      <JobList
        testID="saved.list"
        jobs={view === 'ready' ? jobs : []}
        savedIds={savedIds}
        onToggleSave={toggle}
        onOpen={openJob}
        header={header}
        footer={footer}
        refreshing={query.isRefetching}
        onRefresh={() => void query.refetch()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing['2'], padding: spacing['4'] },
  spacer: { height: spacing['4'] },
});
