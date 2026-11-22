// "Choose one way to apply" (website: routes/apply.$jobId.index.tsx): structured form, upload CV, quick apply, and the
// job's own questions. Wording is the website's. D32: the methods are pressable rows (icon tile, title, the full
// description, the CTA line as the one affordance and the spoken name), the questions are a flat form with the error
// under its field, and Quick Apply is the sticky bar at the bottom (`apply.quick.card` keeps its testID for the flows).
import type { SymbolViewProps } from 'expo-symbols';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { CustomFieldResponses } from '@/api/schemas/applications';
import type { Job } from '@/api/schemas/jobs';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Panel } from '@/components/ui/Panel';
import { Pill } from '@/components/ui/Pill';
import { PressableScale } from '@/components/ui/PressableScale';
import { StickyActionBar } from '@/components/ui/StickyActionBar';
import { AppText } from '@/components/ui/Text';
import { useFieldScroll } from '@/components/ui/useFieldScroll';
import { announce } from '@/lib/announce';
import { haptic } from '@/lib/haptics';
import { colors, radius, spacing } from '@/theme/tokens';

import { ApplyBody, ApplyFrame, type ApplyReady } from '../components/ApplyFrame';
import { ApplyingForCard } from '../components/ApplyingForCard';
import { JobQuestionsForm } from '../components/JobQuestionsForm';
import { useQuickApply } from '../hooks/useApply';
import { type AnswerProblem, answersForSubmit, firstProblem } from '../logic/customFields';

const ICONS = {
  form: { ios: 'doc.text', android: 'description', web: 'description' },
  upload: { ios: 'arrow.up.doc', android: 'upload_file', web: 'upload_file' },
  lock: { ios: 'lock', android: 'lock', web: 'lock' },
} as const satisfies Record<string, SymbolViewProps['name']>;

export function ApplyChooserScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  return (
    <ApplyFrame prefix="apply" jobId={jobId}>
      {(ready) => <Chooser {...ready} />}
    </ApplyFrame>
  );
}

function Chooser({ job, me, hasFormCv }: ApplyReady) {
  const router = useRouter();
  const quick = useQuickApply();
  const [answers, setAnswers] = useState<CustomFieldResponses>({});
  const [problem, setProblem] = useState<AnswerProblem>();
  const fields = job.customApplicationFields;
  const quickOpen = hasFormCv && !!me;

  const { scrollRef, onLayoutOf, scrollToField } = useFieldScroll();

  useEffect(() => {
    // The success haptic comes with the success toast (R3 #7: one source).
    if (quick.isSuccess) router.replace('/applications');
  }, [quick.isSuccess, router]);

  const onQuickApply = () => {
    if (!me) return;
    const found = firstProblem(fields, answers);
    if (found) {
      // R3 #1: the error sits under its question, maybe off-screen: bring it into view, buzz "error" and speak it.
      // The field speaks a new message itself; the same message again (a second refused tap) is spoken here.
      haptic('error');
      if (problem?.fieldId === found.fieldId && problem.message === found.message) announce(found.message);
      setProblem(found);
      scrollToField(['questions', found.fieldId]);
      return;
    }
    setProblem(undefined);
    haptic('medium');
    quick.mutate({ jobId: job.id, me, answers: answersForSubmit(fields, answers) });
  };

  const open = (screen: '/apply/[jobId]/form' | '/apply/[jobId]/upload') =>
    router.push({ pathname: screen, params: { jobId: job.id } });

  const bar =
    quickOpen && me ? (
      <StickyActionBar testID="apply.quick.card">
        {/* One slot holding text + button: the text column takes the free width (the bar's own leading area is capped
            at half the width, which left "CV" alone on the last line), the button keeps its own width. */}
        <View style={styles.quick}>
          <View testID="apply.quick.text" style={styles.quickText}>
            <AppText variant="label" numberOfLines={1}>
              Quick Apply
            </AppText>
            <AppText variant="caption" weight="regular" numberOfLines={1}>
              {me.name}
            </AppText>
            <AppText
              variant="caption"
              weight="regular"
              color="mutedForeground"
              numberOfLines={2}
              textBreakStrategy="balanced"
            >
              One tap with your saved form CV
            </AppText>
          </View>
          <View testID="apply.quick.button" style={styles.quickButton}>
            <Button
              testID="apply.quick"
              label={quick.isPending ? 'Submitting…' : 'Quick Apply'}
              accessibilityLabel="Quick Apply"
              size="md"
              loading={quick.isPending}
              onPress={onQuickApply}
            />
          </View>
        </View>
      </StickyActionBar>
    ) : null;

  return (
    <ApplyBody prefix="apply" bar={bar} scrollRef={scrollRef}>
      <ApplyingForCard job={job} />

      <View style={styles.heading}>
        <AppText variant="heading">Choose one way to apply</AppText>
        <AppText color="mutedForeground">
          Use the structured form <AppText weight="bold">or</AppText> upload a CV file — not both for the same
          application.
        </AppText>
      </View>

      <View style={styles.rows}>
        <ChoiceRow
          testID="apply.choice.form"
          icon={ICONS.form}
          title="Structured form"
          description="15-step form that builds your professional CV and syncs to recruiters."
          cta={hasFormCv ? 'Edit & apply' : 'Start form'}
          highlight={!hasFormCv}
          onPress={() => open('/apply/[jobId]/form')}
        />
        <ChoiceRow
          testID="apply.choice.upload"
          icon={ICONS.upload}
          title="Upload CV"
          description="Submit a PDF or DOCX only. Your portal form CV won't be used for this application."
          cta="Upload & apply"
          disabled={!hasFormCv}
          disabledReason="You must complete the structured form once before you can use CV upload."
          onPress={() => open('/apply/[jobId]/upload')}
        />
      </View>

      {fields.length > 0 && (
        <View testID="apply.questions.group" style={styles.questions} onLayout={onLayoutOf('questions')}>
          <JobQuestionsForm
            testID="apply.questions"
            title="Answer these job-specific questions"
            fields={fields}
            values={answers}
            onChange={(next) => {
              setAnswers(next);
              setProblem(undefined);
            }}
            disabled={quick.isPending}
            problem={problem}
            onLayoutOf={onLayoutOf}
          />
          <AppText variant="secondary" color="mutedForeground">
            Required for all application methods (form, upload, or quick apply).
          </AppText>
        </View>
      )}

      {!quickOpen && (
        <Panel testID="apply.quick.locked" tone="neutral" icon={ICONS.lock} title="Quick Apply">
          <AppText color="mutedForeground">
            Quick Apply unlocks after you complete the structured form once.
          </AppText>
        </Panel>
      )}
    </ApplyBody>
  );
}

type ChoiceProps = {
  testID: string;
  icon: SymbolViewProps['name'];
  title: string;
  description: string;
  cta: string;
  onPress: () => void;
  highlight?: boolean;
  disabled?: boolean;
  disabledReason?: string;
};

/**
 * A method row: 40-pt icon tile, title, the description (wraps, never cut), and the CTA line as the one affordance
 * (round 2 dropped the chevron that repeated it). Spoken: "title, Recommended, CTA"; the description is the hint.
 */
function ChoiceRow({
  testID,
  icon,
  title,
  description,
  cta,
  onPress,
  highlight,
  disabled,
  disabledReason,
}: ChoiceProps) {
  const recommended = highlight && !disabled;
  return (
    <PressableScale
      testID={testID}
      accessibilityLabel={[title, recommended ? 'Recommended' : '', cta].filter(Boolean).join(', ')}
      accessibilityHint={disabled ? disabledReason : description}
      disabled={disabled}
      pressScale={0.99}
      onPress={onPress}
      style={styles.row}
    >
      <View style={styles.tile}>
        <Icon testID={`${testID}.icon`} name={icon} size={20} tintColor={colors.brand} />
      </View>
      <View style={styles.rowText}>
        <View style={styles.titleRow}>
          <AppText variant="rowTitle" numberOfLines={2} style={styles.shrink}>
            {title}
          </AppText>
          {recommended ? <Pill testID="apply.recommended" label="Recommended" tone="brand" /> : null}
        </View>
        <AppText variant="secondary" color="mutedForeground">
          {description}
        </AppText>
        <AppText variant="secondary" weight="semibold" color={disabled ? 'mutedForeground' : 'brand'}>
          {cta}
        </AppText>
        {disabled && disabledReason ? (
          <View style={styles.reason}>
            <Icon name={ICONS.lock} size={14} tintColor={colors.mutedForeground} />
            <AppText variant="secondary" color="mutedForeground" style={styles.shrink}>
              {disabledReason}
            </AppText>
          </View>
        ) : null}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  heading: { gap: spacing['2'] },
  rows: { gap: spacing['2'] },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing['3'],
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing['3'],
  },
  tile: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: spacing['1'] },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing['2'] },
  shrink: { flexShrink: 1 },
  reason: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing['1'] },
  questions: { gap: spacing['2'] },
  quick: { flexDirection: 'row', alignItems: 'center', gap: spacing['3'] },
  quickText: { flex: 1, minWidth: 0 },
  quickButton: { flexShrink: 0 },
});

export type { Job };
