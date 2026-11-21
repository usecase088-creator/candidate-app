import { FlashList } from '@shopify/flash-list';
import { memo, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import type { IntlJob } from '@/api/schemas/jobs';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pill } from '@/components/ui/Pill';
import { Screen } from '@/components/ui/Screen';
import { SearchField } from '@/components/ui/SearchField';
import { AppText } from '@/components/ui/Text';
import { spacing } from '@/theme/tokens';

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
import { useIntlJobs } from '../hooks/useJobsData';
import { deadlineInfo } from '../logic/deadline';
import { ALL_COUNTRIES, countriesOf, intlFilter, visaTone } from '../logic/intl';

const SEARCH_ICON = { ios: 'magnifyingglass', android: 'search', web: 'search' } as const;

/**
 * Website foreign-jobs.tsx: the 11-column table becomes one 5-line row per listing (D32). The native stack header
 * carries the title "International jobs"; the content starts with the subtitle, the stats strip, search and country chips.
 */
export function IntlJobsScreen() {
  const query = useIntlJobs();
  const openLink = useOpenLink();
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState(ALL_COUNTRIES);
  const view = queryView(query);
  const jobs = useMemo(() => query.data ?? [], [query.data]);
  const countries = useMemo(() => countriesOf(jobs), [jobs]);
  const visible = useMemo(() => intlFilter(jobs, search, country), [jobs, search, country]);
  const flagOf = (c: string) =>
    c === ALL_COUNTRIES ? '🌍' : (jobs.find((j) => j.country === c)?.countryFlag ?? '');

  const stats =
    view === 'ready' && jobs.length > 0
      ? [
          { id: 'total', label: 'Total Listings', value: jobs.length },
          { id: 'countries', label: 'Countries', value: new Set(jobs.map((j) => j.country)).size },
          {
            id: 'sponsorship',
            label: 'With Sponsorship',
            value: jobs.filter((j) => j.visaSponsorship === 'Sponsorship').length,
          },
        ]
      : null;

  const header = (
    <View style={styles.header}>
      <AppText variant="secondary" color="mutedForeground">
        Verified international listings — salary disclosed, visa status included.
      </AppText>
      {stats ? <StatsStrip testID="intl" stats={stats} /> : null}
      <SearchField
        testID="intl.search"
        placeholder="Search by role, specialty, city…"
        accessibilityLabel="Search international jobs"
        value={search}
        onChangeText={setSearch}
      />
      {view === 'ready' && jobs.length > 0 && (
        // The chip row bleeds to the screen edges so the last chip scrolls out instead of clipping at the margin.
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsRow}
          contentContainerStyle={styles.chips}
        >
          {countries.map((c) => (
            <Chip
              key={c}
              testID={`intl.country.${c}`}
              label={`${flagOf(c)} ${c}`.trim()}
              selected={country === c}
              onPress={() => setCountry(c)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );

  let footer = null;
  if (view !== 'ready') {
    footer = (
      <QueryStatus
        view={view}
        testID="intl"
        error={query.error}
        onRetry={() => void query.refetch()}
        retrying={query.isFetching}
        skeleton={<ListingSkeleton testID="intl.loading" tall />}
      />
    );
  } else if (jobs.length === 0) {
    footer = (
      <EmptyState
        testID="intl.empty"
        title="No international jobs yet"
        message="International listings are posted by our team. Check back soon."
      />
    );
  } else if (visible.length === 0) {
    footer = (
      <EmptyState
        testID="intl.nomatch"
        title="No listings match your search."
        message="Try a different keyword or country."
        icon={SEARCH_ICON}
      />
    );
  } else {
    footer = (
      <ListingFooter testID="intl.footer" shown={visible.length} total={jobs.length} noun="international" />
    );
  }

  return (
    <Screen testID="intl.screen" padded={false}>
      <FlashList
        testID="intl.list"
        data={view === 'ready' ? visible : []}
        keyExtractor={(j) => j.id}
        renderItem={({ item }) => <IntlRow job={item} onOpen={openLink} />}
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

const joinParts = (parts: readonly (string | null | undefined)[]) =>
  parts
    .map((p) => p?.trim() ?? '')
    .filter(Boolean)
    .join(' · ');

/**
 * One listing as five lines: position; specialty · city · flag country; pay scale; visa + deadline pills;
 * experience · qualification · license (empty parts dropped). The external-link button is the only action
 * (disabled once expired). testIDs `intl.card.{id}`, `intl.payscale.{id}`, `intl.visa.{id}`, `intl.apply.{id}`.
 */
const IntlRow = memo(function IntlRow({ job, onOpen }: { job: IntlJob; onOpen: (url: string) => void }) {
  const info = deadlineInfo(job.lastDate);
  const expired = info.kind === 'expired';
  const where = joinParts([job.specialty, job.city, `${job.countryFlag} ${job.country}`.trim()]);
  const requirements = joinParts([job.experience, job.qualification, job.license]);
  return (
    <View testID={`intl.card.${job.id}`} style={listingRowStyles.row}>
      <View style={listingRowStyles.text}>
        <AppText variant="rowTitle" color={expired ? 'mutedForeground' : 'foreground'} numberOfLines={2}>
          {job.jobPosition}
        </AppText>
        <AppText variant="secondary" color="mutedForeground" numberOfLines={2}>
          {where}
        </AppText>
        <AppText
          testID={`intl.payscale.${job.id}`}
          variant="body"
          weight="semibold"
          tabular
          numberOfLines={1}
        >
          {job.payscale || '—'}
        </AppText>
        <View style={listingRowStyles.pills}>
          <Pill
            testID={`intl.visa.${job.id}`}
            tone={visaTone(job.visaSponsorship)}
            label={job.visaSponsorship}
          />
          <DeadlinePill testID={`intl.deadline.${job.id}`} info={info} />
        </View>
        {requirements ? (
          <AppText variant="secondary" color="mutedForeground" numberOfLines={2}>
            {requirements}
          </AppText>
        ) : null}
      </View>
      <ExternalLinkButton
        testID={`intl.apply.${job.id}`}
        accessibilityLabel={`Apply, ${job.jobPosition}`}
        disabled={expired}
        onPress={() => onOpen(job.applyLink)}
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
  chipsRow: { marginHorizontal: -spacing['4'] },
  chips: { gap: spacing['2'], paddingHorizontal: spacing['4'], paddingVertical: spacing['1'] },
});
