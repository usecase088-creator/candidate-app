import { FlashList } from '@shopify/flash-list';
import { memo, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { GovJob } from '@/api/schemas/jobs';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { AppText } from '@/components/ui/Text';
import { TextInput } from '@/components/ui/TextInput';
import { colors, radius, spacing } from '@/theme/tokens';

import { QueryStatus } from '../components/QueryStatus';
import {
  BackToOpportunities,
  DeadlineLine,
  ListingFooter,
  ListingHero,
} from '../components/listings/ListingParts';
import { useOpenLink } from '../components/listings/useOpenLink';
import { queryView } from '../hooks/queryView';
import { useGovJobs } from '../hooks/useJobsData';
import { deadlineInfo } from '../logic/deadline';
import { govFilter } from '../logic/gov';

/** Website gov-jobs.tsx: the table becomes one card per listing. */
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
      <BackToOpportunities testID="gov.back" />
      <ListingHero
        testID="gov"
        title="🏛️ Government Jobs & Exams"
        subtitle="Latest notifications — AIIMS, UPSC, State PSC, and more."
        stats={stats}
      />
      {/* Store rule (Google Play Deceptive Behavior, docs/store/STORE-RULES.md): no implied government affiliation. */}
      <View testID="gov.disclaimer" accessibilityRole="text" style={styles.disclaimer}>
        <AppText variant="caption" color="mutedForeground">
          ApronHanger is not a government app and is not affiliated with any government body. Listings are
          collected from public notifications; always apply through the official website of the authority (the
          &quot;View / Apply&quot; link).
        </AppText>
      </View>
      <TextInput
        testID="gov.search"
        label="Search"
        placeholder="Search by authority or exam name…"
        value={search}
        onChangeText={setSearch}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
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
        skeleton={
          <View testID="gov.loading" style={styles.loading}>
            <AppText color="mutedForeground" align="center">
              Loading government jobs…
            </AppText>
            <Skeleton width="100%" height={110} radius={radius.xl} />
            <Skeleton width="100%" height={110} radius={radius.xl} />
          </View>
        }
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
    footer = (
      <View testID="gov.nomatch" style={styles.noMatch}>
        <AppText color="warningText">No listings match your search.</AppText>
      </View>
    );
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
        renderItem={({ item }) => <GovCard job={item} onOpen={openLink} />}
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

const GovCard = memo(function GovCard({ job, onOpen }: { job: GovJob; onOpen: (url: string) => void }) {
  const info = deadlineInfo(job.lastDate);
  const expired = info.kind === 'expired';
  return (
    <View testID={`gov.card.${job.id}`} style={styles.card}>
      <AppText variant="label" weight="semibold">
        {job.examAuthority}
      </AppText>
      <AppText color="mutedForeground">{job.name}</AppText>
      <DeadlineLine info={info} />
      <Button
        testID={`gov.apply.${job.id}`}
        label="View / Apply"
        accessibilityLabel={`View / Apply, ${job.examAuthority}`}
        variant={expired ? 'outline' : 'primary'}
        disabled={expired}
        fullWidth={false}
        onPress={() => onOpen(job.link)}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  disclaimer: {
    backgroundColor: colors.muted,
    borderRadius: radius.lg,
    padding: spacing['3'],
  },
  content: { padding: spacing['4'] },
  header: { gap: spacing['4'], marginBottom: spacing['4'] },
  loading: { gap: spacing['3'] },
  noMatch: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
    backgroundColor: '#FEFCE8',
    padding: spacing['3'],
  },
  card: {
    gap: spacing['2'],
    alignItems: 'flex-start',
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing['4'],
    marginBottom: spacing['3'],
  },
});
