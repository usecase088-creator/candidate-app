import { FlashList } from '@shopify/flash-list';
import { memo, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import type { IntlJob } from '@/api/schemas/jobs';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
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
import { useIntlJobs } from '../hooks/useJobsData';
import { deadlineInfo } from '../logic/deadline';
import { ALL_COUNTRIES, countriesOf, intlFilter, visaColors } from '../logic/intl';

/** Website foreign-jobs.tsx: the 11-column table becomes one card per listing, with the same columns. */
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
      <BackToOpportunities testID="intl.back" />
      <ListingHero
        testID="intl"
        title="🌍 International Healthcare Jobs"
        subtitle="Verified international listings — salary disclosed, visa status included."
        stats={stats}
      />
      <TextInput
        testID="intl.search"
        label="Search"
        placeholder="Search by role, specialty, city…"
        value={search}
        onChangeText={setSearch}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {view === 'ready' && jobs.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
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
        skeleton={
          <View testID="intl.loading" style={styles.loading}>
            <AppText color="mutedForeground" align="center">
              Loading international jobs…
            </AppText>
            <Skeleton width="100%" height={160} radius={radius.xl} />
            <Skeleton width="100%" height={160} radius={radius.xl} />
          </View>
        }
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
      <View testID="intl.nomatch" style={styles.noMatch}>
        <AppText color="warningText">
          No listings match your search. Try a different keyword or country.
        </AppText>
      </View>
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
        renderItem={({ item }) => <IntlCard job={item} onOpen={openLink} />}
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

const IntlCard = memo(function IntlCard({ job, onOpen }: { job: IntlJob; onOpen: (url: string) => void }) {
  const info = deadlineInfo(job.lastDate);
  const expired = info.kind === 'expired';
  const visa = visaColors(job.visaSponsorship);
  return (
    <View testID={`intl.card.${job.id}`} style={styles.card}>
      <AppText variant="bodyLg" weight="semibold">
        {job.jobPosition}
      </AppText>
      <Row label="Specialty" value={job.specialty} />
      <Row label="City" value={job.city} />
      <Row label="Country" value={`${job.countryFlag} ${job.country}`} />
      <Row label="Pay Scale" value={job.payscale || '—'} valueTestID={`intl.payscale.${job.id}`} strong />
      <Row label="Experience" value={job.experience || '—'} />
      <Row label="Qualification" value={job.qualification || '—'} />
      <Row label="License" value={job.license || '—'} />
      <View style={styles.row}>
        <AppText variant="caption" color="mutedForeground" style={styles.label}>
          Visa
        </AppText>
        <View testID={`intl.visa.${job.id}`} style={[styles.visa, { backgroundColor: visa.bg }]}>
          <AppText variant="caption" weight="semibold" style={{ color: visa.text }}>
            {job.visaSponsorship}
          </AppText>
        </View>
      </View>
      <View style={styles.row}>
        <AppText variant="caption" color="mutedForeground" style={styles.label}>
          Last Date
        </AppText>
        <DeadlineLine info={info} />
      </View>
      <Button
        testID={`intl.apply.${job.id}`}
        label="Apply"
        accessibilityLabel={`Apply, ${job.jobPosition}`}
        variant={expired ? 'outline' : 'primary'}
        disabled={expired}
        fullWidth={false}
        onPress={() => onOpen(job.applyLink)}
      />
    </View>
  );
});

function Row({
  label,
  value,
  strong,
  valueTestID,
}: {
  label: string;
  value: string;
  strong?: boolean;
  valueTestID?: string;
}) {
  return (
    <View style={styles.row}>
      <AppText variant="caption" color="mutedForeground" style={styles.label}>
        {label}
      </AppText>
      <AppText
        testID={valueTestID}
        variant="caption"
        weight={strong ? 'semibold' : 'regular'}
        style={styles.value}
      >
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing['4'] },
  header: { gap: spacing['4'], marginBottom: spacing['4'] },
  chips: { gap: spacing['2'], paddingVertical: spacing['1'] },
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
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing['2'],
    alignSelf: 'stretch',
  },
  label: { width: 96 },
  value: { flex: 1, flexShrink: 1 },
  visa: { borderRadius: radius.full, paddingHorizontal: spacing['3'], paddingVertical: 2 },
});
