import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { type ReactNode } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { ERROR_MESSAGES, isApiError } from '@/api/errors';
import type { Job } from '@/api/schemas/jobs';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Icon } from '@/components/ui/Icon';
import { LogoTile } from '@/components/ui/LogoTile';
import { Panel } from '@/components/ui/Panel';
import { Pill } from '@/components/ui/Pill';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { StickyActionBar } from '@/components/ui/StickyActionBar';
import { AppText } from '@/components/ui/Text';
import { useIsSignedIn } from '@/features/auth/sessionStore';
import { goToSignIn } from '@/features/auth/signInGate';
import { colors, radius, spacing } from '@/theme/tokens';

import { JobRow } from '../components/JobRow';
import { SaveButton } from '../components/SaveButton';
import { queryView } from '../hooks/queryView';
import { useJob, useSimilarJobs } from '../hooks/useJobsData';
import { useSavedIdSet, useToggleSave } from '../hooks/useSavedJobs';
import { applicantsLine, experienceStat, htmlToText, postedLabel } from '../logic/format';
import { useOpenJob } from '../useOpenJob';

/** Website jobs.$jobId.tsx prints the raw numbers on the details page (cards use formatLPA). */
const salaryOf = (job: Job) => `₹${job.salaryMin}–${job.salaryMax} LPA`;

const ICONS = {
  seal: { ios: 'checkmark.seal.fill', android: 'verified', web: 'verified' },
  check: { ios: 'checkmark.circle', android: 'check_circle', web: 'check_circle' },
  sparkles: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' },
  person: { ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' },
} as const;

/**
 * Website jobs.$jobId.tsx: every section, in the website's order and wording. D32: native header (the role as its
 * title once loaded), flat header block, 17/600 section headers, a flat stats grid, a tinted match panel, and the
 * Apply + Save actions in a sticky bar under the scroll view (so it never covers the content).
 */
export function JobDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const query = useJob(id);
  const view = queryView(query);
  const job = query.data;

  const notFound = isApiError(query.error) && query.error.status === 404;

  return (
    // The bar pads the bottom inset itself; the native header takes the top.
    <Screen testID="job.screen" edges={['top']} padded={false}>
      <ScrollView testID="job.screen.scroll" contentContainerStyle={styles.content}>
        {view === 'loading' && <DetailsSkeleton />}

        {view === 'offline' && (
          <ErrorState
            testID="job.offline"
            title="You're offline"
            message={ERROR_MESSAGES.network}
            onRetry={() => void query.refetch()}
            retrying={query.isFetching}
          />
        )}

        {view === 'error' &&
          (notFound ? (
            <View testID="job.notfound" style={styles.center}>
              <AppText variant="heading" align="center">
                Job not found
              </AppText>
              <Button
                testID="job.notfound.browse"
                label="Browse opportunities"
                fullWidth={false}
                onPress={() => router.replace('/')}
              />
            </View>
          ) : (
            <ErrorState
              testID="job.error"
              message={isApiError(query.error) ? query.error.message : ERROR_MESSAGES.generic}
              onRetry={() => void query.refetch()}
              retrying={query.isFetching}
            />
          ))}

        {job && <Details job={job} />}
      </ScrollView>
      {job && <ActionBar job={job} />}
    </Screen>
  );
}

function Details({ job }: { job: Job }) {
  const savedIds = useSavedIdSet();
  const { toggle } = useToggleSave();
  const openJob = useOpenJob();
  const similar = useSimilarJobs(job);
  const applicants = applicantsLine(job.applicants);

  return (
    <>
      <Stack.Screen options={{ title: job.role }} />

      <View testID="job.header" style={styles.header}>
        <View style={styles.headerRow}>
          <LogoTile testID="job.logo" name={job.hospital} uri={job.hospitalLogoUrl} size={56} />
          <View style={styles.flex}>
            <AppText variant="title">{job.role}</AppText>
            <AppText numberOfLines={2}>{`${job.hospital} · ${job.specialty}`}</AppText>
          </View>
        </View>
        {job.hospitalVerified ? (
          <Pill testID="job.verified" label="Verified Hospital" tone="brand" icon={ICONS.seal} />
        ) : null}
        <View style={styles.meta} accessible accessibilityRole="text">
          <Meta text={job.location} />
          <Dot />
          <Meta text={job.type} />
          <Dot />
          <Meta text={`Posted ${postedLabel(job.postedDays, { sentence: true })}`} />
        </View>
        {job.tags.length > 0 && (
          <View style={styles.pills}>
            {job.tags.map((t, i) => (
              <Pill key={t} testID={`job.tag.${i}`} label={t} tone="neutral" />
            ))}
          </View>
        )}
      </View>

      <Section title="Compensation">
        <AppText testID="job.salary" variant="title" tabular>
          {salaryOf(job)}
        </AppText>
        <AppText variant="secondary" color="mutedForeground">
          Salary disclosed by hospital · Verified
        </AppText>
        {applicants ? (
          <AppText variant="secondary" color="mutedForeground">
            {applicants}
          </AppText>
        ) : null}
        <View testID="job.stats" style={styles.stats}>
          <Stat id="experience" label="Experience" value={experienceStat(job)} />
          <Stat id="type" label="Job type" value={job.type || '—'} />
          <Stat id="location" label="Location" value={job.city || '—'} />
          <Stat id="posted" label="Posted" value={postedLabel(job.postedDays)} />
        </View>
      </Section>

      <Panel
        testID="job.match"
        tone={job.matchPercent ? 'info' : 'neutral'}
        icon={job.matchPercent ? ICONS.sparkles : ICONS.person}
        title="Match insights"
      >
        <AppText>
          {job.matchPercent
            ? `Your profile matches ${job.matchPercent}% of this role's criteria.`
            : 'Complete your profile for a personalized match.'}
        </AppText>
      </Panel>

      {job.description ? (
        <Section title="About the role">
          <AppText testID="job.description">{htmlToText(job.description)}</AppText>
        </Section>
      ) : null}

      {job.responsibilities.length > 0 && (
        <Section title="Responsibilities">
          <CheckList items={job.responsibilities} />
        </Section>
      )}

      {job.requirements.length > 0 && (
        <Section title="Requirements">
          <CheckList items={job.requirements} />
        </Section>
      )}

      {job.perks.length > 0 && (
        <Section title="Perks & benefits">
          <View style={styles.pills}>
            {job.perks.map((p, i) => (
              <Pill key={p} testID={`job.perk.${i}`} label={p} tone="neutral" />
            ))}
          </View>
        </Section>
      )}

      {job.hospitalAbout ? (
        <Section title={`About ${job.hospital}`}>
          <AppText>{job.hospitalAbout}</AppText>
        </Section>
      ) : null}

      {similar.data && similar.data.length > 0 && (
        <View testID="job.similar" style={styles.similar}>
          <AppText variant="heading" style={styles.similarTitle}>
            Similar opportunities
          </AppText>
          {similar.data.map((j) => (
            <JobRow key={j.id} job={j} saved={savedIds.has(j.id)} onToggleSave={toggle} onOpen={openJob} />
          ))}
        </View>
      )}
    </>
  );
}

/** Apply Now + Save pinned at the bottom; the salary on the left when there is room for all three (D32). */
function ActionBar({ job }: { job: Job }) {
  const router = useRouter();
  const signedIn = useIsSignedIn();
  const savedIds = useSavedIdSet();
  const { toggle } = useToggleSave();
  const { width, fontScale } = useWindowDimensions();
  const closed = job.status === 'Closed';
  // At 320 pt, or with large text, two buttons already fill the bar: the salary stays in the Compensation section.
  const roomForSalary = width / Math.max(1, fontScale) >= 360;

  return (
    <StickyActionBar
      testID="job.bar"
      leading={
        roomForSalary ? (
          <AppText variant="rowTitle" tabular numberOfLines={1}>
            {salaryOf(job)}
          </AppText>
        ) : undefined
      }
    >
      <SaveButton
        testID="job.savebutton"
        variant="button"
        size="md"
        saved={savedIds.has(job.id)}
        onPress={() => toggle(job)}
      />
      <Button
        testID="job.apply"
        label={closed ? 'Position closed' : 'Apply Now'}
        size="md"
        disabled={closed}
        haptic="medium"
        onPress={() =>
          signedIn
            ? router.push({ pathname: '/apply/[jobId]', params: { jobId: job.id } })
            : goToSignIn(`/apply/${job.id}`)
        }
      />
    </StickyActionBar>
  );
}

/** Flat section: 17/600 sentence-case header, 8 to the content (the heading variant carries the header role). */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="heading">{title}</AppText>
      {children}
    </View>
  );
}

function CheckList({ items }: { items: string[] }) {
  return (
    <View style={styles.list}>
      {items.map((item) => (
        <View key={item} style={styles.listItem}>
          <Icon name={ICONS.check} tintColor={colors.brand} size={16} style={styles.listIcon} />
          <AppText style={styles.flex}>{item}</AppText>
        </View>
      ))}
    </View>
  );
}

function Meta({ text }: { text: string }) {
  return (
    <AppText variant="secondary" color="mutedForeground" style={styles.shrink}>
      {text}
    </AppText>
  );
}

function Dot() {
  return (
    <AppText variant="secondary" color="mutedForeground" accessibilityElementsHidden>
      {' · '}
    </AppText>
  );
}

/** One cell of the flat stats grid: 12/500 muted label over a 15/600 value, no tile. */
function Stat({ id, label, value }: { id: string; label: string; value: string }) {
  return (
    <View testID={`job.stats.${id}`} style={styles.stat}>
      <AppText variant="caption" color="mutedForeground">
        {label}
      </AppText>
      <AppText weight="semibold" tabular>
        {value}
      </AppText>
    </View>
  );
}

/** Shaped like the header block, the salary line and the first paragraph. */
function DetailsSkeleton() {
  return (
    <View testID="job.loading" style={styles.header}>
      <View style={styles.headerRow}>
        <Skeleton width={56} height={56} radius={radius.md} />
        <View style={styles.flex}>
          <Skeleton width="70%" height={22} />
          <View style={styles.gap} />
          <Skeleton width="50%" height={15} />
        </View>
      </View>
      <Skeleton width="60%" height={13} />
      <View style={styles.gap} />
      <Skeleton width="40%" height={22} />
      <View style={styles.gap} />
      <Skeleton width="100%" height={14} />
      <Skeleton width="90%" height={14} />
      <Skeleton width="60%" height={14} />
    </View>
  );
}

const styles = StyleSheet.create({
  // D32: screen margin 16, section gap 24; the similar list bleeds to the edges.
  content: { flexGrow: 1, gap: spacing['6'], paddingVertical: spacing['4'] },
  center: { alignItems: 'center', gap: spacing['4'], padding: spacing['6'] },
  flex: { flex: 1, flexShrink: 1 },
  // In a content-sized row `flex: 1` collapses the text to zero width on Android; shrink only.
  shrink: { flexShrink: 1 },
  gap: { height: spacing['2'] },
  header: { gap: spacing['3'], paddingHorizontal: spacing['4'] },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing['3'] },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing['2'] },
  section: { gap: spacing['2'], paddingHorizontal: spacing['4'] },
  list: { gap: spacing['2'] },
  listItem: { flexDirection: 'row', gap: spacing['2'], alignItems: 'flex-start' },
  // Centres a 16-pt icon on the 20-pt first line.
  listIcon: { marginTop: 2 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing['3'], paddingTop: spacing['2'] },
  stat: { flexGrow: 1, flexBasis: '40%', gap: spacing['0.5'] },
  similar: { gap: 0 },
  similarTitle: { paddingHorizontal: spacing['4'], paddingBottom: spacing['2'] },
});
