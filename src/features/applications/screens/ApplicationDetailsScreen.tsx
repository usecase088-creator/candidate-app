// One application with its answer card (website: the row and CandidateActionCard in routes/applications.tsx). It lives on
// its own screen because forms and file pickers inside a recycled list would lose what was typed (D27).
// D32: native header titled "Application" (the role is the hero title, said once), identity block, then the panel that
// needs the candidate, then the vertical timeline, then "View job" as a row.
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ERROR_MESSAGES, isApiError } from '@/api/errors';
import type { Application } from '@/api/schemas/applications';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { ListRow } from '@/components/ui/ListRow';
import { LogoTile } from '@/components/ui/LogoTile';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { AppText } from '@/components/ui/Text';
import { queryView } from '@/features/jobs/hooks/queryView';
import { colors, radius, shadows, spacing } from '@/theme/tokens';

import { StatusPill } from '../components/StatusPill';
import { VerticalTimeline } from '../components/VerticalTimeline';
import { ActionCard } from '../components/actions/ActionCard';
import { useApplications } from '../hooks/useApplications';
import { formatIndianDate } from '../logic/interview';
import { timelineView } from '../logic/status';

export function ApplicationDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const query = useApplications();
  const view = queryView(query);
  const application = query.data?.find((a) => a.id === id);

  return (
    <Screen testID="application.screen" scroll>
      <View style={styles.stack}>
        {view === 'loading' && <DetailsSkeleton testID="application.loading" />}

        {view === 'offline' && (
          <ErrorState
            testID="application.offline"
            title="You're offline"
            message={ERROR_MESSAGES.network}
            onRetry={() => void query.refetch()}
            retrying={query.isFetching}
          />
        )}

        {view === 'error' && (
          <ErrorState
            testID="application.error"
            message={isApiError(query.error) ? query.error.message : ERROR_MESSAGES.generic}
            onRetry={() => void query.refetch()}
            retrying={query.isFetching}
          />
        )}

        {view === 'ready' && !application && (
          <View testID="application.notfound" style={styles.center}>
            <AppText variant="heading" align="center">
              Application not found
            </AppText>
            <Button
              testID="application.notfound.back"
              label="My Applications"
              size="md"
              fullWidth={false}
              onPress={() => router.replace('/applications')}
            />
          </View>
        )}

        {application && <Details application={application} />}
      </View>
    </Screen>
  );
}

function Details({ application: a }: { application: Application }) {
  const router = useRouter();
  const place = a.job.city || a.job.location || '';
  const applied = formatIndianDate(a.appliedOn);
  // The terminal note is part of the timeline for a closed application; otherwise it is shown on its own.
  const noteInTimeline = timelineView(a.status).kind === 'message';

  return (
    <>
      <View style={styles.identity}>
        <LogoTile testID="application.logo" name={a.job.hospital} uri={a.job.hospitalLogoUrl} size={48} />
        <View style={styles.text}>
          <AppText variant="title" numberOfLines={2}>
            {a.job.role}
          </AppText>
          <AppText variant="secondary" color="mutedForeground" numberOfLines={2}>
            {place ? `${a.job.hospital} · ${place}` : a.job.hospital}
          </AppText>
          {applied ? (
            <AppText variant="secondary" color="mutedForeground" tabular numberOfLines={1}>
              {`Applied ${applied}`}
            </AppText>
          ) : null}
          <View style={styles.pill}>
            <StatusPill testID="application.status" status={a.status} />
          </View>
        </View>
      </View>

      <ActionCard application={a} />

      <View style={styles.card}>
        <AppText variant="heading">Progress</AppText>
        <VerticalTimeline testID="application.timeline" application={a} />
        {a.finalStatusNote && !noteInTimeline ? <AppText>{a.finalStatusNote}</AppText> : null}
      </View>

      <View style={[styles.card, styles.rowCard]}>
        <ListRow
          testID="application.viewjob"
          title="View job"
          titleVariant="rowTitle"
          onPress={() => a.jobId && router.push({ pathname: '/job/[id]', params: { id: a.jobId } })}
        />
      </View>
    </>
  );
}

function DetailsSkeleton({ testID }: { testID: string }) {
  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel="Loading"
      accessibilityRole="progressbar"
      style={styles.stack}
    >
      <View style={styles.identity}>
        <Skeleton width={48} height={48} radius={radius.md} />
        <View style={styles.text}>
          <Skeleton width="70%" height={22} />
          <Skeleton width="50%" height={13} />
          <Skeleton width={96} height={22} radius={radius.full} />
        </View>
      </View>
      <Skeleton width="100%" height={160} radius={radius.md} />
      <Skeleton width="100%" height={200} radius={radius.md} />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing['4'] },
  center: { alignItems: 'center', gap: spacing['3'], paddingVertical: spacing['6'] },
  identity: { flexDirection: 'row', gap: spacing['3'], alignItems: 'flex-start' },
  text: { flexShrink: 1, flexGrow: 1, gap: spacing['0.5'] },
  pill: { marginTop: spacing['1'] },
  card: {
    gap: spacing['3'],
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    boxShadow: shadows.soft,
    padding: spacing['4'],
  },
  rowCard: { padding: 0, overflow: 'hidden' },
});
