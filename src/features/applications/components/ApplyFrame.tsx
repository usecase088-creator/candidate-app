// The shell shared by the apply screens: loading, offline, error, "Job not found" and "Already applied"
// (website: routes/apply.$jobId.tsx loader and the first lines of each apply route). `children` gets what is ready
// and renders an `ApplyBody`: the scrolling content plus, when the screen has one primary action, the sticky bar
// under it (D32: above the bottom inset, hidden while the keyboard is up). The native stack header carries the back
// chevron and the title (src/features/navigation/pushedScreens.ts).
import { useRouter } from 'expo-router';
import { type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ERROR_MESSAGES, isApiError } from '@/api/errors';
import type { CandidateMe } from '@/api/schemas/candidate';
import type { Job } from '@/api/schemas/jobs';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { AppText } from '@/components/ui/Text';
import { radius, spacing } from '@/theme/tokens';

import { useApplyContext } from '../hooks/useApplyContext';

export type ApplyReady = { job: Job; me: CandidateMe | undefined; hasFormCv: boolean };

type Props = {
  /** testIDs: `{prefix}.screen`, `.screen.scroll`, `.loading`, `.offline`, `.error`, `.notfound`, `.applied`. */
  prefix: string;
  jobId: string;
  /** Shown instead of the sentence "... for {role} at {hospital}." when set. */
  appliedMessage?: (job: Job) => string;
  /** The ready screen: render an `ApplyBody` with the same prefix. */
  children: (ready: ApplyReady) => ReactNode;
};

export function ApplyFrame({ prefix, jobId, appliedMessage, children }: Props) {
  const router = useRouter();
  const ctx = useApplyContext(jobId);
  const notFound = isApiError(ctx.jobError) && ctx.jobError.status === 404;
  const failure = ctx.view === 'error' ? (ctx.jobError ?? ctx.meError) : undefined;

  if (ctx.view === 'ready' && ctx.job && !ctx.alreadyApplied) {
    return (
      <Screen testID={`${prefix}.screen`} edges={['top']} padded={false}>
        {children({ job: ctx.job, me: ctx.me, hasFormCv: ctx.hasFormCv })}
      </Screen>
    );
  }

  return (
    <Screen testID={`${prefix}.screen`} edges={['top']} padded={false}>
      <ApplyBody prefix={prefix}>
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
      </ApplyBody>
    </Screen>
  );
}

export type ApplyBodyProps = {
  prefix: string;
  children: ReactNode;
  /** A `StickyActionBar`, rendered under the scroll view so it never covers the content. */
  bar?: ReactNode;
};

/** The scrolling content of an apply screen (`{prefix}.screen.scroll`) with the optional sticky bar under it. */
export function ApplyBody({ prefix, children, bar }: ApplyBodyProps) {
  return (
    <>
      <ScrollView
        testID={`${prefix}.screen.scroll`}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        {children}
      </ScrollView>
      {bar}
    </>
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

/** Mirrors the applying-for row, the heading and two method rows. */
function ApplySkeleton({ testID }: { testID: string }) {
  return (
    <View testID={testID} style={styles.skeleton}>
      <View style={styles.skeletonRow}>
        <Skeleton width={40} height={40} radius={radius.sm} />
        <View style={styles.lines}>
          <Skeleton width="30%" height={12} />
          <Skeleton width="70%" height={18} />
          <Skeleton width="55%" height={12} />
        </View>
      </View>
      <Skeleton width="60%" height={20} />
      <Skeleton width="100%" height={64} radius={radius.md} />
      <Skeleton width="100%" height={64} radius={radius.md} />
    </View>
  );
}

const styles = StyleSheet.create({
  // D32: screen margin 16, section gap 24, room at the end so the last field clears the bar.
  content: { flexGrow: 1, gap: spacing['6'], padding: spacing['4'], paddingBottom: spacing['8'] },
  center: { alignItems: 'center', gap: spacing['3'], paddingVertical: spacing['6'] },
  skeleton: { gap: spacing['4'] },
  skeletonRow: { flexDirection: 'row', gap: spacing['3'] },
  lines: { flexGrow: 1, gap: spacing['2'] },
});
