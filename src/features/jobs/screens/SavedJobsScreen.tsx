import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/Text';
import { spacing } from '@/theme/tokens';

import { JobListSkeleton } from '../components/JobCardSkeleton';
import { JobList } from '../components/JobList';
import { QueryStatus } from '../components/QueryStatus';
import { queryView } from '../hooks/queryView';
import { useSavedJobs, useToggleSave } from '../hooks/useSavedJobs';
import { useOpenJob } from '../useOpenJob';

/** Website saved-jobs.tsx. The list is the saved-jobs cache, so unsaving a card removes it at once. */
export function SavedJobsScreen() {
  const router = useRouter();
  const openJob = useOpenJob();
  const query = useSavedJobs();
  const { toggle } = useToggleSave();
  const view = queryView(query);

  const jobs = useMemo(() => (query.data ?? []).map((s) => s.job), [query.data]);
  const savedIds = useMemo(() => new Set(jobs.map((j) => j.id)), [jobs]);
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const browse = () => router.navigate('/');

  const header = (
    <View style={styles.header}>
      <Button
        testID="saved.back"
        label="← Back"
        accessibilityLabel="Back"
        variant="ghost"
        fullWidth={false}
        onPress={goBack}
      />
      <AppText variant="title" accessibilityRole="header">
        Saved jobs
      </AppText>
      {view === 'ready' && (
        <AppText testID="saved.count" color="mutedForeground">
          {`${jobs.length} role${jobs.length !== 1 ? 's' : ''} bookmarked for later`}
        </AppText>
      )}
      <Button
        testID="saved.browse"
        label="Browse opportunities →"
        accessibilityLabel="Browse opportunities"
        variant="ghost"
        fullWidth={false}
        onPress={browse}
      />
    </View>
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

const styles = StyleSheet.create({ header: { gap: spacing['2'], marginBottom: spacing['4'] } });
