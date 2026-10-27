// The 16-step profile form (website ProfileFormWizard). Each step is saved when the user taps Next, so they can stop
// and come back; the step they reached is remembered. The sign-in phone and email are shown, never edited (B8).
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { CandidateMe } from '@/api/schemas/candidate';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { FormErrorBox } from '@/components/ui/FormErrorBox';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { AppText } from '@/components/ui/Text';
import { failureText } from '@/features/applications/messages';
import { queryView } from '@/features/jobs/hooks/queryView';
import { colors, radius, spacing } from '@/theme/tokens';

import { FormField } from '../builder/components/FormField';
import { type Block, type FieldSpec, stepBlocks } from '../builder/formSpec';
import { type Draft, draftFromMe, type ProfileJson, profileFromDraft } from '../builder/model';
import { LAST_STEP, STEPS } from '../builder/options';
import { clearSavedStep, saveStep, useSavedStep } from '../builder/useBuilderStep';
import { validateStep } from '../builder/validation';
import { CANDIDATE_ME_KEY, useCandidateMe } from '../hooks/useCandidateMe';
import { profileApi } from '../profileApi';

type Row = Record<string, unknown>;

export function ProfileBuilderScreen() {
  const query = useCandidateMe();
  const savedStep = useSavedStep();
  const view = queryView(query);
  const ready = view === 'ready' && query.data && savedStep !== undefined;
  return (
    <>
      {ready ? (
        <Builder me={query.data} initialStep={savedStep} />
      ) : (
        <Screen testID="builder.screen" scroll>
          {view === 'error' || view === 'offline' ? (
            <ErrorState
              testID="builder.loadError"
              message={view === 'offline' ? "You're offline." : 'We could not load your profile.'}
              onRetry={() => void query.refetch()}
              retrying={query.isFetching}
            />
          ) : (
            <Skeleton testID="builder.loading" width="100%" height={120} />
          )}
        </Screen>
      )}
    </>
  );
}

function Builder({ me, initialStep }: { me: CandidateMe; initialStep: number }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft>(() => draftFromMe(me));
  const [step, setStep] = useState(initialStep);
  const [error, setError] = useState<string>();
  const base = (me.profile ?? {}) as ProfileJson;

  const save = useMutation({
    mutationFn: () => profileApi.save(profileFromDraft(draft, base)),
    onSuccess: (updated) => queryClient.setQueryData(CANDIDATE_ME_KEY, updated),
  });

  const goTo = (n: number) => {
    setStep(n);
    void saveStep(n);
  };
  const exit = () => (router.canGoBack() ? router.back() : router.replace('/profile'));
  const set = (key: string, value: unknown) => setDraft((d) => ({ ...d, [key]: value }));

  async function onNext() {
    const problem = validateStep(step, draft);
    if (problem) return setError(problem);
    setError(undefined);
    try {
      await save.mutateAsync();
      goTo(step + 1);
    } catch (e) {
      setError(failureText(e, 'Failed to save profile'));
    }
  }

  async function onSubmit() {
    for (let i = 0; i < LAST_STEP; i++) {
      const problem = validateStep(i, draft);
      if (problem) {
        setError(problem);
        goTo(i);
        return;
      }
    }
    setError(undefined);
    try {
      await save.mutateAsync();
      await clearSavedStep();
      router.replace('/profile');
    } catch (e) {
      setError(failureText(e, 'Failed to save profile'));
    }
  }

  const meta = STEPS[step]!;
  return (
    <Screen testID="builder.screen" scroll scrollToTopKey={step}>
      <View style={styles.stack}>
        <Button
          testID="builder.exit"
          label="← Back"
          accessibilityLabel="Back to profile"
          variant="ghost"
          fullWidth={false}
          onPress={exit}
        />
        <AppText testID="builder.progress" variant="caption" color="mutedForeground">
          {`Step ${step + 1} of ${STEPS.length}`}
        </AppText>
        <View style={styles.bar} accessible={false}>
          <View style={[styles.barFill, { width: `${Math.round(((step + 1) / STEPS.length) * 100)}%` }]} />
        </View>
        <AppText variant="title" accessibilityRole="header">
          {meta.label}
        </AppText>
        <AppText color="mutedForeground">{meta.description}</AppText>

        {step === LAST_STEP ? (
          <Review draft={draft} />
        ) : (
          stepBlocks(step, draft).map((block, i) => (
            <BlockView key={`${step}.${i}`} block={block} draft={draft} set={set} />
          ))
        )}

        {error ? <FormErrorBox testID="builder.error" message={error} /> : null}

        <View style={styles.nav}>
          {step > 0 ? (
            <Button
              testID="builder.back"
              label="Back"
              variant="outline"
              disabled={save.isPending}
              onPress={() => {
                setError(undefined);
                goTo(step - 1);
              }}
            />
          ) : null}
          {step < LAST_STEP ? (
            <Button
              testID="builder.next"
              label="Next"
              loading={save.isPending}
              onPress={() => void onNext()}
            />
          ) : (
            <Button
              testID="builder.submit"
              label="Save profile"
              loading={save.isPending}
              onPress={() => void onSubmit()}
            />
          )}
        </View>
      </View>
    </Screen>
  );
}

function BlockView({
  block,
  draft,
  set,
}: {
  block: Block;
  draft: Draft;
  set: (key: string, value: unknown) => void;
}) {
  const values = draft as unknown as Row;
  if (block.type === 'fields') {
    return (
      <View style={styles.stack}>
        {block.fields.map((f) => (
          <FormField
            key={f.key}
            testID={`builder.field.${f.key}`}
            spec={f}
            value={values[f.key]}
            onChange={(v) => set(f.key, v)}
          />
        ))}
      </View>
    );
  }
  const items = (values[block.key] as Row[]) ?? [];
  const update = (i: number, key: string, value: unknown) =>
    set(
      block.key,
      items.map((item, n) => (n === i ? { ...item, [key]: value } : item)),
    );
  return (
    <View style={styles.stack}>
      {items.map((item, i) => (
        <View key={i} style={styles.card}>
          <AppText variant="label">{`${block.itemLabel} ${i + 1}`}</AppText>
          {block.fields(item).map((f: FieldSpec) => (
            <FormField
              key={f.key}
              testID={`builder.${block.key}.${i}.${f.key}`}
              spec={f}
              value={item[f.key]}
              onChange={(v) => update(i, f.key, v)}
            />
          ))}
          <Button
            testID={`builder.${block.key}.${i}.remove`}
            label="Remove"
            accessibilityLabel={`Remove ${block.itemLabel} ${i + 1}`}
            variant="ghost"
            onPress={() =>
              set(
                block.key,
                items.filter((_, n) => n !== i),
              )
            }
          />
        </View>
      ))}
      <Button
        testID={`builder.${block.key}.add`}
        label={block.addLabel}
        variant="outline"
        onPress={() => set(block.key, [...items, block.empty()])}
      />
    </View>
  );
}

function Review({ draft }: { draft: Draft }) {
  const rows: [string, string, string][] = [
    ['name', 'Name', draft.fullName],
    ['role', 'Role', [draft.role, draft.grade, draft.specialty].filter(Boolean).join(' · ')],
    [
      'registration',
      'Registration',
      [draft.registrationCouncil, draft.registrationNumber].filter(Boolean).join(' · '),
    ],
    ['qualifications', 'Qualifications', `${draft.qualifications.length} entries`],
    ['experience', 'Experience', `${draft.experience.length} positions`],
    ['procedures', 'Procedures', `${draft.procedures.length} entries`],
    ['research', 'Research', `${draft.publicationDetails.length} publications`],
    ['highlights', 'Highlights', `${draft.professionalHighlights.length} entries`],
    ['salary', 'Salary expectation', `₹${draft.expectedSalaryMin}-${draft.expectedSalaryMax} LPA`],
    ['documents', 'Documents', draft.documentChecklist.join(', ')],
  ];
  return (
    <View style={styles.stack}>
      {rows.map(([key, label, value]) => (
        <View key={key} style={styles.reviewRow}>
          <AppText variant="caption" color="mutedForeground">
            {label}
          </AppText>
          <AppText testID={`builder.review.${key}`}>{value || '—'}</AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing['4'] },
  card: {
    gap: spacing['3'],
    padding: spacing['3'],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
  },
  nav: { gap: spacing['2'] },
  bar: { height: 6, borderRadius: radius.full, backgroundColor: colors.muted, overflow: 'hidden' },
  barFill: { height: 6, backgroundColor: colors.primary },
  reviewRow: { gap: 2 },
});
