import { FlashList } from '@shopify/flash-list';
import { memo, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { GovJob } from '@/api/schemas/jobs';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { SearchField } from '@/components/ui/SearchField';
import { AppText } from '@/components/ui/Text';
import { colors, radius, spacing } from '@/theme/tokens';

import { QueryStatus } from '../components/QueryStatus';
import {
  DeadlinePill,
  ExternalLinkButton,
  ListingFooter,
  ListingSkeleton,
  listingRowStyles,
  StatsStrip,
} from '../components/listings/ListingParts';
import { useOpenLink } from '../components/listings/useOpenLink';
import { queryView } from '../hooks/queryView';
import { useGovJobs } from '../hooks/useJobsData';
import { deadlineInfo } from '../logic/deadline';
import { govFilter } from '../logic/gov';

const SEARCH_ICON = { ios: 'magnifyingglass', android: 'search', web: 'search' } as const;

/**
 * Website gov-jobs.tsx: the table becomes one row per listing (D32). The native stack header carries the title
 * "Government jobs"; the content starts with the website subtitle, the stats strip, the store disclaimer and the search.
 */
export function GovJobsScreen() {
  const query = useGovJobs();
  const openLink = useOpenLink();
  const [search, setSearch] = useState('');
  const view = queryView(query);
  const jobs = useMemo(() => query.data ?? [], [query.data]);
  const visible = useMemo(() => govFilter(jobs, search), [jobs, search]);

  const stats =
    view === 'ready' && jobs.length > 0
      ? [
          { id: 'total', label: 'Total Listings', value: jobs.length },
          { id: 'deadline', label: 'With Deadline', value: jobs.filter((j) => j.lastDate).length },
          { id: 'open', label: 'Open-ended', value: jobs.filter((j) => !j.lastDate).length },
        ]
      : null;

  const header = (
    <View style={styles.header}>
      <AppText variant="secondary" color="mutedForeground">
        Latest notifications — AIIMS, UPSC, State PSC, and more.
      </AppText>
      {stats ? <StatsStrip testID="gov" stats={stats} /> : null}
      {/* Store rule (Google Play Deceptive Behavior, docs/store/STORE-RULES.md): no implied government affiliation. */}
      <View testID="gov.disclaimer" accessibilityRole="text" style={styles.disclaimer}>
        <AppText variant="secondary" color="mutedForeground">
          ApronHanger is not a government app and is not affiliated with any government body. Listings are
          collected from public notifications; always apply through the official website of the authority (the
          &quot;View / Apply&quot; link).
        </AppText>
      </View>
      <SearchField
        testID="gov.search"
        placeholder="Search by authority or exam name…"
        accessibilityLabel="Search government jobs"
        value={search}
        onChangeText={setSearch}
      />
    </View>
  );

  let footer = null;
  if (view !== 'ready') {
    footer = (
      <QueryStatus
        view={view}
        testID="gov"
        error={query.error}
        onRetry={() => void query.refetch()}
        retrying={query.isFetching}
        skeleton={<ListingSkeleton testID="gov.loading" />}
      />
    );
  } else if (jobs.length === 0) {
    footer = (
      <EmptyState
        testID="gov.empty"
        title="No government jobs yet"
        message="Check back soon for new listings."
      />
    );
  } else if (visible.length === 0) {
    footer = <EmptyState testID="gov.nomatch" title="No listings match your search." icon={SEARCH_ICON} />;
  } else {
    footer = (
      <ListingFooter testID="gov.footer" shown={visible.length} total={jobs.length} noun="government" />
    );
  }

  return (
    <Screen testID="gov.screen" padded={false}>
      <FlashList
        testID="gov.list"
        data={view === 'ready' ? visible : []}
        keyExtractor={(j) => j.id}
        renderItem={({ item }) => <GovRow job={item} onOpen={openLink} />}
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

/**
 * One listing: authority (the website's key column) as the title, exam name under it, the deadline as a pill, and
 * the external-link button as the only action (disabled once expired). testIDs `gov.card.{id}`, `gov.apply.{id}`.
 */
const GovRow = memo(function GovRow({ job, onOpen }: { job: GovJob; onOpen: (url: string) => void }) {
  const info = deadlineInfo(job.lastDate);
  const expired = info.kind === 'expired';
  return (
    <View testID={`gov.card.${job.id}`} style={listingRowStyles.row}>
      <View style={listingRowStyles.text}>
        <AppText variant="rowTitle" color={expired ? 'mutedForeground' : 'foreground'} numberOfLines={2}>
          {job.examAuthority}
        </AppText>
        <AppText variant="body" color="mutedForeground" numberOfLines={2}>
          {job.name}
        </AppText>
        <View style={listingRowStyles.pills}>
          <DeadlinePill testID={`gov.deadline.${job.id}`} info={info} />
        </View>
      </View>
      <ExternalLinkButton
        testID={`gov.apply.${job.id}`}
        accessibilityLabel={`View / Apply, ${job.examAuthority}`}
        disabled={expired}
        onPress={() => onOpen(job.link)}
      />
    </View>
  );
});

// D32: the header keeps its own 16-pt inset; rows run edge to edge and inset themselves (like JobList).
const styles = StyleSheet.create({
  content: { paddingBottom: spacing['6'] },
  header: {
    gap: spacing['3'],
    paddingHorizontal: spacing['4'],
    paddingTop: spacing['3'],
    paddingBottom: spacing['3'],
  },
  disclaimer: {
    backgroundColor: colors.muted,
    borderRadius: radius.md,
    padding: spacing['3'],
  },
});
