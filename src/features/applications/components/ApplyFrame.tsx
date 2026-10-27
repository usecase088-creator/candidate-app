// The shell shared by the apply screens: back button, loading, offline, error, "Job not found" and "Already applied"
// (website: routes/apply.$jobId.tsx loader and the first lines of each apply route). `children` gets what is ready.
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ERROR_MESSAGES, isApiError } from '@/api/errors';
import type { CandidateMe } from '@/api/schemas/candidate';
import type { Job } from '@/api/schemas/jobs';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { AppText } from '@/components/ui/Text';
import { colors, radius, spacing } from '@/theme/tokens';

import { useApplyContext } from '../hooks/useApplyContext';

export type ApplyReady = { job: Job; me: CandidateMe | undefined; hasFormCv: boolean };

type Props = {
  /** testIDs: `{prefix}.screen`, `.back`, `.loading`, `.offline`, `.error`, `.notfound`, `.applied`. */
  prefix: string;
  jobId: string;
  onBack: () => void;
  /** Shown instead of the sentence "... for {role} at {hospital}." when set. */
  appliedMessage?: (job: Job) => string;
  children: (ready: ApplyReady) => ReactNode;
};

export function ApplyFrame({ prefix, jobId, onBack, appliedMessage, children }: Props) {
  const router = useRouter();
  const ctx = useApplyContext(jobId);
  const notFound = isApiError(ctx.jobError) && ctx.jobError.status === 404;
  const failure = ctx.view === 'error' ? (ctx.jobError ?? ctx.meError) : undefined;

  return (
    <Screen testID={`${prefix}.screen`} scroll>
      <View style={styles.stack}>
        <Button
          testID={`${prefix}.back`}
          label="← Back"
          accessibilityLabel="Back"
          variant="ghost"
          fullWidth={false}
          onPress={onBack}
        />

        {ctx.view === 'loading' && <ApplySkeleton testID={`${prefix}.loading`} />}

        {ctx.view === 'offline' && (
          <ErrorState
            testID={`${prefix}.offline`}
            title="You're offline"
            message={ERROR_MESSAGES.network}
            onRetry={ctx.retry}
            retrying={ctx.retrying}
          />
        )}

        {ctx.view === 'error' &&
          (notFound ? (
            <View testID={`${prefix}.notfound`} style={styles.center}>
              <AppText variant="heading" align="center">
                Job not found
              </AppText>
              <Button
                testID={`${prefix}.notfound.browse`}
                label="Browse opportunities"
                fullWidth={false}
                onPress={() => router.replace('/')}
              />
            </View>
          ) : (
            <ErrorState
              testID={`${prefix}.error`}
              message={isApiError(failure) ? failure.message : ERROR_MESSAGES.generic}
              onRetry={ctx.retry}
              retrying={ctx.retrying}
            />
          ))}

        {ctx.view === 'ready' && ctx.job && ctx.alreadyApplied && (
          <AlreadyApplied
            testID={`${prefix}.applied`}
            message={
              appliedMessage
                ? appliedMessage(ctx.job)
                : `You have already submitted an application for ${ctx.job.role} at ${ctx.job.hospital}.`
            }
            onView={() => router.replace('/applications')}
          />
        )}

        {ctx.view === 'ready' &&
          ctx.job &&
          !ctx.alreadyApplied &&
          children({ job: ctx.job, me: ctx.me, hasFormCv: ctx.hasFormCv })}
      </View>
    </Screen>
  );
}

function AlreadyApplied({
  testID,
  message,
  onView,
}: {
  testID: string;
  message: string;
  onView: () => void;
}) {
  return (
    <View testID={testID} style={styles.center}>
      <AppText variant="title" align="center" accessibilityRole="header">
        Already applied
      </AppText>
      <AppText color="mutedForeground" align="center">
        {message}
      </AppText>
      <Button testID={`${testID}.view`} label="View my applications" fullWidth={false} onPress={onView} />
    </View>
  );
}

function ApplySkeleton({ testID }: { testID: string }) {
  return (
    <View testID={testID} style={styles.stack}>
      <View style={styles.card}>
        <Skeleton width={48} height={48} radius={radius.lg} />
        <View style={styles.lines}>
          <Skeleton width="40%" height={12} />
          <Skeleton width="70%" height={18} />
          <Skeleton width="55%" height={12} />
        </View>
      </View>
      <Skeleton width="60%" height={22} />
      <Skeleton width="100%" height={120} radius={radius.xl} />
      <Skeleton width="100%" height={120} radius={radius.xl} />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing['4'] },
  center: { alignItems: 'center', gap: spacing['3'], paddingVertical: spacing['6'] },
  card: {
    flexDirection: 'row',
    gap: spacing['4'],
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing['4'],
  },
  lines: { flexGrow: 1, gap: spacing['2'] },
});
