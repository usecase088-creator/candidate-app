import { FlashList } from '@shopify/flash-list';
import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Job } from '@/api/schemas/jobs';
import { spacing } from '@/theme/tokens';

import { JobRow } from './JobRow';

type Props = {
  testID: string;
  jobs: readonly Job[];
  savedIds: ReadonlySet<string>;
  onToggleSave: (job: Job) => void;
  onOpen: (job: Job) => void;
  header?: ReactElement | null;
  /** Rendered under the header when `jobs` is empty, or instead of the jobs while loading/failed. */
  footer?: ReactElement | null;
  refreshing: boolean;
  onRefresh: () => void;
};

/** FlashList of job rows (Home, Search, Saved; D32). The server sends at most 50 jobs, so there is no paging. */
export function JobList({
  testID,
  jobs,
  savedIds,
  onToggleSave,
  onOpen,
  header,
  footer,
  refreshing,
  onRefresh,
}: Props) {
  return (
    <FlashList
      testID={testID}
      data={jobs}
      keyExtractor={(j) => j.id}
      renderItem={({ item }) => (
        <JobRow job={item} saved={savedIds.has(item.id)} onToggleSave={onToggleSave} onOpen={onOpen} />
      )}
      extraData={savedIds}
      ListHeaderComponent={header}
      ListFooterComponent={footer ? <View style={styles.footer}>{footer}</View> : null}
      refreshing={refreshing}
      onRefresh={onRefresh}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.content}
    />
  );
}

// D32: rows run edge to edge with their own 16-pt inset; headers and footers bring their own margins.
const styles = StyleSheet.create({
  content: { paddingBottom: spacing['6'] },
  footer: { paddingHorizontal: spacing['4'] },
});
