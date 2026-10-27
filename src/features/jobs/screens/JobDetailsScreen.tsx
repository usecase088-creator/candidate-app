import { SymbolView } from 'expo-symbols';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ERROR_MESSAGES, isApiError } from '@/api/errors';
import type { Job } from '@/api/schemas/jobs';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { AppText } from '@/components/ui/Text';
import { colors, radius, spacing } from '@/theme/tokens';

import { HospitalLogo } from '../components/HospitalLogo';
import { JobCard } from '../components/JobCard';
import { SaveButton } from '../components/SaveButton';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { queryView } from '../hooks/queryView';
import { useJob, useSimilarJobs } from '../hooks/useJobsData';
import { useSavedIdSet, useToggleSave } from '../hooks/useSavedJobs';
import { applicantsLine, experienceStat, htmlToText, postedLabel } from '../logic/format';
import { useOpenJob } from '../useOpenJob';

/** Website jobs.$jobId.tsx: every section, in the website's order and wording. */
export function JobDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const query = useJob(id);
  const view = queryView(query);
  const job = query.data;

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const notFound = isApiError(query.error) && query.error.status === 404;

  return (
    <Screen testID="job.screen" scroll>
      <View style={styles.stack}>
        <Button
          testID="job.back"
          label="← Back to opportunities"
          accessibilityLabel="Back to opportunities"
          variant="ghost"
          fullWidth={false}
          onPress={goBack}
        />

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
      </View>
    </Screen>
  );
}

function Details({ job }: { job: Job }) {
  const router = useRouter();
  const savedIds = useSavedIdSet();
  const { toggle } = useToggleSave();
  const openJob = useOpenJob();
  const similar = useSimilarJobs(job);
  const applicants = applicantsLine(job.applicants);
  const closed = job.status === 'Closed';

  return (
    <>
      <View testID="job.header" style={styles.card}>
        <View style={styles.headerRow}>
          <HospitalLogo uri={job.hospitalLogoUrl} size={56} />
          <View style={styles.flex}>
            <AppText variant="title" accessibilityRole="header">
              {job.role}
            </AppText>
            {job.hospitalVerified ? <VerifiedBadge label="Verified Hospital" /> : null}
            <AppText color="mutedForeground">{`${job.hospital} · ${job.specialty}`}</AppText>
          </View>
        </View>
        <View style={styles.meta}>
          <Meta icon={{ ios: 'mappin.and.ellipse', android: 'location_on' }} text={job.location} />
          <Meta icon={{ ios: 'briefcase', android: 'work' }} text={job.type} />
          <Meta
            icon={{ ios: 'calendar', android: 'calendar_today' }}
            text={`Posted ${postedLabel(job.postedDays, { sentence: true })}`}
          />
        </View>
      </View>

      {job.tags.length > 0 && (
        <View style={styles.chips}>
          {job.tags.map((t) => (
            <View key={t} style={styles.tag}>
              <AppText variant="caption" weight="medium" color="mutedForeground">
                {t}
              </AppText>
            </View>
          ))}
        </View>
      )}

      {job.description ? (
        <Section title="About the role">
          <AppText testID="job.description" color="mutedForeground">
            {htmlToText(job.description)}
          </AppText>
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
          <View style={styles.chips}>
            {job.perks.map((p) => (
              <View key={p} style={styles.perk}>
                <AppText variant="caption">{p}</AppText>
              </View>
            ))}
          </View>
        </Section>
      )}

      {job.hospitalAbout ? (
        <Section title={`About ${job.hospital}`}>
          <AppText color="mutedForeground">{job.hospitalAbout}</AppText>
        </Section>
      ) : null}

      <View style={styles.card}>
        <AppText variant="caption" weight="medium" color="mutedForeground" style={styles.upper}>
          Compensation
        </AppText>
        <AppText testID="job.salary" variant="title">{`₹${job.salaryMin}–${job.salaryMax} LPA`}</AppText>
        <View testID="job.stats" style={styles.stats}>
          <Stat label="Experience" value={experienceStat(job)} />
          <Stat label="Job type" value={job.type || '—'} />
          <Stat label="Location" value={job.city || '—'} />
          <Stat label="Posted" value={postedLabel(job.postedDays)} />
        </View>
        <Button
          testID="job.apply"
          label={closed ? 'Position closed' : 'Apply Now'}
          disabled={closed}
          onPress={() => router.push({ pathname: '/apply/[jobId]', params: { jobId: job.id } })}
        />
        <SaveButton
          testID="job.savebutton"
          variant="button"
          saved={savedIds.has(job.id)}
          onPress={() => toggle(job)}
        />
        <AppText variant="caption" color="mutedForeground" align="center">
          Salary disclosed by hospital · Verified
        </AppText>
        {applicants ? (
          <AppText variant="caption" color="mutedForeground" align="center">
            {applicants}
          </AppText>
        ) : null}
      </View>

      <View style={styles.card}>
        <AppText variant="caption" weight="medium" color="mutedForeground" style={styles.upper}>
          Match insights
        </AppText>
        <AppText color="mutedForeground">
          {job.matchPercent
            ? `Your profile matches ${job.matchPercent}% of this role's criteria.`
            : 'Complete your profile for a personalized match.'}
        </AppText>
      </View>

      {similar.data && similar.data.length > 0 && (
        <View testID="job.similar" style={styles.stack}>
          <AppText variant="heading">Similar opportunities</AppText>
          {similar.data.map((j) => (
            <JobCard key={j.id} job={j} saved={savedIds.has(j.id)} onToggleSave={toggle} onOpen={openJob} />
          ))}
        </View>
      )}
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.card}>
      <AppText
        variant="label"
        weight="semibold"
        color="mutedForeground"
        style={styles.upper}
        accessibilityRole="header"
      >
        {title}
      </AppText>
      {children}
    </View>
  );
}

function CheckList({ items }: { items: string[] }) {
  return (
    <View style={styles.list}>
      {items.map((item) => (
        <View key={item} style={styles.listItem}>
          <SymbolView
            name={{ ios: 'checkmark.circle', android: 'check_circle', web: 'check_circle' }}
            tintColor={colors.brand}
            size={16}
          />
          <AppText color="mutedForeground" style={styles.flex}>
            {item}
          </AppText>
        </View>
      ))}
    </View>
  );
}

function Meta({
  icon,
  text,
}: {
  icon: {
    ios: 'mappin.and.ellipse' | 'briefcase' | 'calendar';
    android: 'location_on' | 'work' | 'calendar_today';
  };
  text: string;
}) {
  return (
    <View style={styles.metaItem}>
      <SymbolView name={{ ...icon, web: icon.android }} tintColor={colors.mutedForeground} size={12} />
      <AppText variant="caption" color="mutedForeground" style={styles.shrink}>
        {text}
      </AppText>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <AppText variant="caption" color="mutedForeground" style={styles.upper}>
        {label}
      </AppText>
      <AppText weight="medium">{value}</AppText>
    </View>
  );
}

function DetailsSkeleton() {
  return (
    <View testID="job.loading" style={styles.card}>
      <View style={styles.headerRow}>
        <Skeleton width={56} height={56} radius={radius.lg} />
        <View style={styles.flex}>
          <Skeleton width="70%" height={22} />
          <View style={styles.gap} />
          <Skeleton width="50%" height={14} />
        </View>
      </View>
      <Skeleton width="100%" height={14} />
      <Skeleton width="90%" height={14} />
      <Skeleton width="60%" height={14} />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing['4'] },
  center: { alignItems: 'center', gap: spacing['4'], padding: spacing['6'] },
  flex: { flex: 1, flexShrink: 1 },
  // In a content-sized row `flex: 1` collapses the text to zero width on Android; shrink only.
  shrink: { flexShrink: 1 },
  gap: { height: spacing['2'] },
  card: {
    gap: spacing['3'],
    backgroundColor: colors.card,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing['5'],
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing['3'] },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing['3'] },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing['1'], flexShrink: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing['2'] },
  tag: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.muted,
    paddingHorizontal: spacing['3'],
    paddingVertical: spacing['1'],
  },
  perk: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    paddingHorizontal: spacing['3'],
    paddingVertical: spacing['1'],
  },
  list: { gap: spacing['2'] },
  listItem: { flexDirection: 'row', gap: spacing['2'], alignItems: 'flex-start' },
  upper: { textTransform: 'uppercase', letterSpacing: 0.6 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing['3'] },
  stat: {
    flexGrow: 1,
    flexBasis: '40%',
    gap: spacing['1'],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    padding: spacing['3'],
  },
});
