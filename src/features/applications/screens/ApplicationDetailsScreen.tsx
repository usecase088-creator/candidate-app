// One application with its answer card (website: the row and CandidateActionCard in routes/applications.tsx). It lives on
// its own screen because forms and file pickers inside a recycled list would lose what was typed (D27).
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ERROR_MESSAGES, isApiError } from '@/api/errors';
import type { Application } from '@/api/schemas/applications';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { AppText } from '@/components/ui/Text';
import { HospitalLogo } from '@/features/jobs/components/HospitalLogo';
import { queryView } from '@/features/jobs/hooks/queryView';
import { colors, radius, spacing } from '@/theme/tokens';

import { StatusPill } from '../components/StatusPill';
import { Timeline } from '../components/Timeline';
import { ActionCard } from '../components/actions/ActionCard';
import { useApplications } from '../hooks/useApplications';
import { formatIndianDate } from '../logic/interview';
import { lastUpdateText } from '../logic/status';

export function ApplicationDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const query = useApplications();
  const view = queryView(query);
  const application = query.data?.find((a) => a.id === id);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/applications'));

  return (
    <Screen testID="application.screen" scroll>
      <View style={styles.stack}>
        <Button
          testID="application.back"
          label="← Back"
          accessibilityLabel="Back"
          variant="ghost"
          fullWidth={false}
          onPress={back}
        />

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

  return (
    <>
      <View style={styles.card}>
        <View style={styles.top}>
          <HospitalLogo uri={a.job.hospitalLogoUrl} size={48} />
          <View style={styles.text}>
            <AppText variant="heading" accessibilityRole="header">
              {a.job.role}
            </AppText>
            <AppText color="mutedForeground">
              {place ? `${a.job.hospital} · ${place}` : a.job.hospital}
            </AppText>
            {applied ? (
              <AppText variant="caption" color="mutedForeground">
                {`Applied ${applied}`}
              </AppText>
            ) : null}
          </View>
        </View>
        <StatusPill testID="application.status" status={a.status} />
        <Timeline testID="application.timeline" status={a.status} />
        <AppText variant="caption" color="mutedForeground">
          {lastUpdateText(a.status)}
        </AppText>
        {a.finalStatusNote ? <AppText>{a.finalStatusNote}</AppText> : null}
        <Button
          testID="application.viewjob"
          label="View job"
          variant="outline"
          fullWidth={false}
          onPress={() => a.jobId && router.push({ pathname: '/job/[id]', params: { id: a.jobId } })}
        />
      </View>

      <ActionCard application={a} />
    </>
  );
}

function DetailsSkeleton({ testID }: { testID: string }) {
  return (
    <View testID={testID} style={styles.card}>
      <View style={styles.top}>
        <Skeleton width={48} height={48} radius={radius.lg} />
        <View style={styles.text}>
          <Skeleton width="70%" height={18} />
          <Skeleton width="50%" height={12} />
        </View>
      </View>
      <Skeleton width={110} height={24} radius={radius.full} />
      <Skeleton width="100%" height={24} />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing['4'] },
  center: { alignItems: 'center', gap: spacing['3'], paddingVertical: spacing['6'] },
  card: {
    gap: spacing['3'],
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing['4'],
  },
  top: { flexDirection: 'row', gap: spacing['3'] },
  text: { flexShrink: 1, flexGrow: 1, gap: spacing['1'] },
});
