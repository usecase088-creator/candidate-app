// "Choose one way to apply" (website: routes/apply.$jobId.index.tsx): structured form, upload CV, quick apply, and the
// job's own questions. Wording is the website's.
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { CustomFieldResponses } from '@/api/schemas/applications';
import type { Job } from '@/api/schemas/jobs';
import { Button } from '@/components/ui/Button';
import { AppText } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { colors, radius, spacing } from '@/theme/tokens';

import { ApplyFrame, type ApplyReady } from '../components/ApplyFrame';
import { ApplyingForCard } from '../components/ApplyingForCard';
import { JobQuestionsForm } from '../components/JobQuestionsForm';
import { useQuickApply } from '../hooks/useApply';
import { answersForSubmit, validateAnswers } from '../logic/customFields';

export function ApplyChooserScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const router = useRouter();
  return (
    <ApplyFrame
      prefix="apply"
      jobId={jobId}
      onBack={() =>
        router.canGoBack() ? router.back() : router.replace({ pathname: '/job/[id]', params: { id: jobId } })
      }
    >
      {(ready) => <Chooser {...ready} />}
    </ApplyFrame>
  );
}

function Chooser({ job, me, hasFormCv }: ApplyReady) {
  const router = useRouter();
  const toast = useToast();
  const quick = useQuickApply();
  const [answers, setAnswers] = useState<CustomFieldResponses>({});
  const [questionError, setQuestionError] = useState<string>();
  const fields = job.customApplicationFields;

  useEffect(() => {
    if (quick.isSuccess) router.replace('/applications');
  }, [quick.isSuccess, router]);

  const onQuickApply = () => {
    if (!me) return;
    const problem = validateAnswers(fields, answers);
    setQuestionError(problem ?? undefined);
    if (problem) {
      toast.show(problem, { variant: 'error' });
      return;
    }
    quick.mutate({ jobId: job.id, me, answers: answersForSubmit(fields, answers) });
  };

  const open = (screen: '/apply/[jobId]/form' | '/apply/[jobId]/upload') =>
    router.push({ pathname: screen, params: { jobId: job.id } });
  const avatar = me?.initials ?? initialsOf(me?.name);

  return (
    <>
      <ApplyingForCard job={job} />

      <View style={styles.heading}>
        <AppText variant="title" accessibilityRole="header">
          Choose one way to apply
        </AppText>
        <AppText color="mutedForeground">
          Use the structured form <AppText weight="bold">or</AppText> upload a CV file — not both for the same
          application.
        </AppText>
      </View>

      <ChoiceCard
        testID="apply.choice.form"
        title="Structured form"
        description="15-step form that builds your professional CV and syncs to recruiters."
        cta={hasFormCv ? 'Edit & apply' : 'Start form'}
        highlight={!hasFormCv}
        onPress={() => open('/apply/[jobId]/form')}
      />

      <ChoiceCard
        testID="apply.choice.upload"
        title="Upload CV"
        description="Submit a PDF or DOCX only. Your portal form CV won't be used for this application."
        cta="Upload & apply"
        disabled={!hasFormCv}
        disabledReason="You must complete the structured form once before you can use CV upload."
        onPress={() => open('/apply/[jobId]/upload')}
      />

      <JobQuestionsForm
        testID="apply.questions"
        title="Answer these job-specific questions"
        fields={fields}
        values={answers}
        onChange={(next) => {
          setAnswers(next);
          setQuestionError(undefined);
        }}
        disabled={quick.isPending}
        error={questionError}
      />
      {fields.length > 0 && (
        <AppText variant="caption" color="mutedForeground">
          Required for all application methods (form, upload, or quick apply).
        </AppText>
      )}

      {hasFormCv && me ? (
        <View testID="apply.quick.card" style={styles.card}>
          <View style={styles.quickRow}>
            <View style={styles.quickText}>
              <AppText variant="label" weight="semibold">
                Quick Apply
              </AppText>
              <AppText variant="caption" color="mutedForeground">
                One tap with your saved form CV
              </AppText>
            </View>
            {avatar ? (
              <View
                style={styles.avatar}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                <AppText variant="caption" weight="semibold" color="primaryForeground">
                  {avatar}
                </AppText>
              </View>
            ) : null}
          </View>
          <Button
            testID="apply.quick"
            label={quick.isPending ? 'Submitting…' : 'Quick Apply'}
            accessibilityLabel="Quick Apply"
            loading={quick.isPending}
            onPress={onQuickApply}
          />
        </View>
      ) : (
        <View testID="apply.quick.locked" style={styles.locked}>
          <AppText variant="caption" color="mutedForeground">
            Quick Apply unlocks after you complete the structured form once.
          </AppText>
        </View>
      )}
    </>
  );
}

function initialsOf(name: string | null | undefined): string {
  return (name ?? '')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

type ChoiceProps = {
  testID: string;
  title: string;
  description: string;
  cta: string;
  onPress: () => void;
  highlight?: boolean;
  disabled?: boolean;
  disabledReason?: string;
};

function ChoiceCard({
  testID,
  title,
  description,
  cta,
  onPress,
  highlight,
  disabled,
  disabledReason,
}: ChoiceProps) {
  return (
    <View style={[styles.card, highlight && !disabled && styles.highlight, disabled && styles.dim]}>
      {highlight && !disabled && (
        <View testID="apply.recommended" style={styles.badge}>
          <AppText variant="caption" weight="semibold" color="brandForeground">
            Recommended
          </AppText>
        </View>
      )}
      <AppText variant="heading">{title}</AppText>
      <AppText color="mutedForeground">{description}</AppText>
      {disabled && disabledReason ? (
        <AppText variant="caption" weight="medium" color="errorText">
          {disabledReason}
        </AppText>
      ) : null}
      <Button
        testID={testID}
        label={cta}
        variant={highlight ? 'primary' : 'outline'}
        disabled={disabled}
        onPress={onPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { gap: spacing['2'] },
  card: {
    gap: spacing['3'],
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing['5'],
  },
  highlight: { borderColor: colors.brand, borderWidth: 2 },
  dim: { opacity: 0.7 },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    backgroundColor: colors.brand,
    paddingHorizontal: spacing['2'],
    paddingVertical: spacing['0.5'],
  },
  quickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing['3'],
  },
  quickText: { flexShrink: 1, gap: spacing['0.5'] },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locked: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    padding: spacing['4'],
  },
});

export type { Job };
