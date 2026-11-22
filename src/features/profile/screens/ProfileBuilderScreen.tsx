// The 16-step profile form (website ProfileFormWizard). As on the website, nothing is sent to the server before the
// last step: until then the draft (and picked vault files) stay on the phone, per user, so the candidate can stop and
// come back, and becomes eligible for Quick Apply at the same point as on the website. The final save is safe to retry:
// files uploaded by a save that failed later are remembered and not uploaded again.
// The sign-in phone and email are shown, never edited (B8).
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { type ComponentRef, Fragment, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import type { CandidateMe, SupportingDocument } from '@/api/schemas/candidate';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { FormErrorBox } from '@/components/ui/FormErrorBox';
import { Screen } from '@/components/ui/Screen';
import { Separator } from '@/components/ui/Separator';
import { Skeleton } from '@/components/ui/Skeleton';
import { StickyActionBar } from '@/components/ui/StickyActionBar';
import { AppText } from '@/components/ui/Text';
import { useKeyboardScroll } from '@/components/ui/useKeyboardScroll';
import { failureText } from '@/features/applications/messages';
import { useSession } from '@/features/auth/sessionStore';
import { queryView } from '@/features/jobs/hooks/queryView';
import { MAX_VAULT_FILES } from '@/features/uploads/logic/files';
import { uploadSupportingDocuments } from '@/features/uploads/uploadsApi';
import { announce } from '@/lib/announce';
import { colors, radius, spacing } from '@/theme/tokens';

import { VaultSection } from '../components/VaultSection';
import { FormField } from '../builder/components/FormField';
import { type BuilderDraft, clearDraft, loadDraft, type PendingFile, saveDraft } from '../builder/draftStore';
import { type Block, type FieldSpec, stepBlocks } from '../builder/formSpec';
import { type Draft, draftFromMe, type ProfileJson, profileFromDraft } from '../builder/model';
import { LAST_STEP, STEPS } from '../builder/options';
import { validateStep } from '../builder/validation';
import { CANDIDATE_ME_KEY, useCandidateMe } from '../hooks/useCandidateMe';
import { profileApi } from '../profileApi';

type Row = Record<string, unknown>;

const TRASH = { ios: 'trash', android: 'delete', web: 'delete' } as const;
const PLUS = { ios: 'plus', android: 'add', web: 'add' } as const;

/** The draft this user left on the phone: undefined while reading, null when there is none. */
function useStoredDraft(userId: string | undefined): BuilderDraft | null | undefined {
  const [loaded, setLoaded] = useState<{ userId: string; draft: BuilderDraft | null }>();
  useEffect(() => {
    if (!userId) return;
    let live = true;
    void loadDraft(userId).then((draft) => live && setLoaded({ userId, draft }));
    return () => {
      live = false;
    };
  }, [userId]);
  if (!userId) return null; // signed in offline without a saved user: no draft is kept
  return loaded?.userId === userId ? loaded.draft : undefined;
}

export function ProfileBuilderScreen() {
  const query = useCandidateMe();
  const userId = useSession((s) => s.user?.id);
  const stored = useStoredDraft(userId);
  const view = queryView(query);
  const ready = view === 'ready' && query.data && stored !== undefined;
  return (
    <>
      {ready ? (
        <Builder me={query.data} stored={stored} userId={userId} />
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
            <View testID="builder.loading" accessible accessibilityLabel="Loading" style={styles.loading}>
              <Skeleton width={96} height={13} />
              <Skeleton width="100%" height={4} radius={radius.full} />
              <Skeleton width="70%" height={22} />
              <Skeleton width="100%" height={48} radius={radius.md} />
              <Skeleton width="100%" height={48} radius={radius.md} />
            </View>
          )}
        </Screen>
      )}
    </>
  );
}

const VAULT_STEP = 14;
const clampStep = (n: number) => (Number.isInteger(n) ? Math.min(Math.max(n, 0), LAST_STEP) : 0);

function Builder({
  me,
  stored,
  userId,
}: {
  me: CandidateMe;
  stored: BuilderDraft | null;
  userId: string | undefined;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft>(() => stored?.draft ?? draftFromMe(me));
  const [step, setStep] = useState(() => clampStep(stored?.step ?? 0));
  const [pending, setPending] = useState<PendingFile[]>(() => stored?.pending ?? []);
  const [uploaded, setUploaded] = useState<SupportingDocument[]>(() => stored?.uploaded ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const saved = me.supportingDocuments ?? [];
  // The picture lives on the account record. The profile JSON can hold an old copy, and the server writes whatever
  // the profile says, so the current picture is put into every save.
  const base: ProfileJson = {
    ...(me.profile ?? {}),
    ...(me.avatarUrl
      ? { avatarUrl: me.avatarUrl, avatarCloudinaryId: me.avatarCloudinaryId ?? undefined }
      : {}),
  };

  // The form scrolls on its own (the action bar sits under it, not in it): a new step starts at the top, a
  // field focused just before the keyboard opens is scrolled above it (Screen does the same in scroll mode).
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const offset = useRef(0);
  // R3 a11y P2-14: the whole content changes but focus stays on Continue: say which step this is.
  const shownStep = useRef(step);
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    if (shownStep.current === step) return;
    shownStep.current = step;
    announce(`Step ${step + 1} of ${STEPS.length}, ${STEPS[step]!.label}`);
  }, [step]);
  useKeyboardScroll(
    (y) => scrollRef.current?.scrollTo({ y, animated: true }),
    () => offset.current,
  );

  /** Writes the draft to the phone. A failed write must not stop the form: the draft is still on screen. */
  const keep = (patch: Partial<BuilderDraft>) =>
    userId
      ? saveDraft(userId, { step, draft, pending, uploaded, ...patch }).catch(() => undefined)
      : Promise.resolve();

  const goTo = (n: number) => {
    setStep(n);
    void keep({ step: n });
  };
  const set = (key: string, value: unknown) => setDraft((d) => ({ ...d, [key]: value }));
  /** The message sits at the end of the form, above the bar: bring it into view. */
  const showError = (message: string) => {
    setError(message);
    scrollRef.current?.scrollToEnd({ animated: true });
  };

  function onNext() {
    const problem = validateStep(step, draft);
    if (problem) return showError(problem);
    setError(undefined);
    goTo(step + 1);
  }

  /** Uploads what is still waiting, in groups the server accepts, remembering each group as soon as it is up. */
  async function uploadWaiting(): Promise<SupportingDocument[]> {
    let done = uploaded;
    let waiting = pending;
    while (waiting.length > 0) {
      const group = waiting.slice(0, MAX_VAULT_FILES);
      const result = await uploadSupportingDocuments(group);
      done = [
        ...done,
        ...result.map((u) => ({
          name: u.name ?? 'Document',
          url: u.url,
          publicId: u.publicId,
          mime: u.mime ?? null,
        })),
      ];
      waiting = waiting.slice(group.length);
      setUploaded(done);
      setPending(waiting);
      await keep({ pending: waiting, uploaded: done });
    }
    return done;
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
    setSaving(true);
    try {
      let done: SupportingDocument[];
      try {
        done = await uploadWaiting();
      } catch (e) {
        showError(
          e instanceof Error && !('kind' in e) ? e.message : failureText(e, 'Could not upload documents'),
        );
        return;
      }
      // The server replaces the stored list as a whole, so the files already there go with the new ones.
      const updated = await profileApi.save(profileFromDraft(draft, base), [...saved, ...done]);
      queryClient.setQueryData(CANDIDATE_ME_KEY, updated);
      if (userId) await clearDraft(userId);
      router.replace('/profile');
    } catch (e) {
      showError(failureText(e, 'Failed to save profile'));
    } finally {
      setSaving(false);
    }
  }

  const meta = STEPS[step]!;
  const progress = Math.round(((step + 1) / STEPS.length) * 100);
  return (
    // R3 #4: the sticky bar pads the bottom inset itself (like JobDetails / ApplyFrame), so the screen takes only the top.
    <Screen testID="builder.screen" edges={['top']} padded={false}>
      <ScrollView
        ref={scrollRef}
        testID="builder.screen.scroll"
        onScroll={(e) => {
          offset.current = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <AppText testID="builder.progress" variant="secondary" color="mutedForeground" tabular>
            {`Step ${step + 1} of ${STEPS.length}`}
          </AppText>
          <View
            style={styles.bar}
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel={`Step ${step + 1} of ${STEPS.length}`}
            accessibilityValue={{ min: 0, max: 100, now: progress }}
          >
            <View style={[styles.barFill, { width: `${progress}%` }]} />
          </View>
          <AppText variant="title" accessibilityRole="header">
            {meta.label}
          </AppText>
          <AppText variant="secondary" color="mutedForeground">
            {meta.description}
          </AppText>
        </View>

        {step === LAST_STEP ? (
          <Review draft={draft} />
        ) : (
          stepBlocks(step, draft).map((block, i) => (
            <BlockView key={`${step}.${i}`} block={block} draft={draft} set={set} />
          ))
        )}

        {step === VAULT_STEP ? (
          <VaultSection
            saved={[...saved, ...uploaded]}
            waiting={pending}
            userId={userId}
            onPicked={(files) => {
              const next = [...pending, ...files];
              setPending(next);
              void keep({ pending: next });
            }}
          />
        ) : null}

        {error ? <FormErrorBox testID="builder.error" message={error} /> : null}
      </ScrollView>

      <StickyActionBar testID="builder.bar">
        {step > 0 ? (
          <Button
            testID="builder.back"
            label="Back"
            variant="secondary"
            disabled={saving}
            onPress={() => {
              setError(undefined);
              goTo(step - 1);
            }}
          />
        ) : null}
        {step < LAST_STEP ? (
          <Button testID="builder.next" label="Continue" onPress={onNext} />
        ) : (
          <Button
            testID="builder.submit"
            label="Save profile"
            haptic="medium"
            loading={saving}
            onPress={() => void onSubmit()}
          />
        )}
      </StickyActionBar>
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
      <View style={styles.fields}>
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
    <View style={styles.fields}>
      {items.map((item, i) => (
        <View key={i} style={styles.card}>
          <View style={styles.cardHeader}>
            <AppText variant="rowTitle" style={styles.flex}>{`${block.itemLabel} ${i + 1}`}</AppText>
            <Button
              testID={`builder.${block.key}.${i}.remove`}
              label="Remove"
              accessibilityLabel={`Remove ${block.itemLabel} ${i + 1}`}
              variant="destructiveText"
              size="sm"
              fullWidth={false}
              icon={TRASH}
              onPress={() =>
                set(
                  block.key,
                  items.filter((_, n) => n !== i),
                )
              }
            />
          </View>
          {block.fields(item).map((f: FieldSpec) => (
            <FormField
              key={f.key}
              testID={`builder.${block.key}.${i}.${f.key}`}
              spec={f}
              value={item[f.key]}
              onChange={(v) => update(i, f.key, v)}
            />
          ))}
        </View>
      ))}
      <Button
        testID={`builder.${block.key}.add`}
        label={block.addLabel}
        variant="secondary"
        size="md"
        icon={PLUS}
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
    <View style={styles.review}>
      {rows.map(([key, label, value], i) => (
        <Fragment key={key}>
          {i > 0 ? <Separator /> : null}
          <View style={styles.reviewRow}>
            <AppText variant="caption" color="mutedForeground">
              {label}
            </AppText>
            <AppText testID={`builder.review.${key}`}>{value || '—'}</AppText>
          </View>
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { gap: spacing['4'] },
  content: { padding: spacing['4'], paddingBottom: spacing['6'], gap: spacing['6'] },
  header: { gap: spacing['2'] },
  fields: { gap: spacing['4'] },
  bar: { height: 4, borderRadius: radius.full, backgroundColor: colors.brandSoft, overflow: 'hidden' },
  barFill: { height: 4, backgroundColor: colors.brand },
  card: {
    gap: spacing['4'],
    padding: spacing['4'],
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.separator,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing['2'] },
  review: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.separator,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  reviewRow: { gap: spacing['0.5'], paddingHorizontal: spacing['4'], paddingVertical: spacing['3'] },
});
