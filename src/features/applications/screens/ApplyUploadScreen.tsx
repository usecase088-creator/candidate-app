// "Apply with your own CV" (website: routes/apply.$jobId.upload.tsx): contact details, one PDF or Word file, the job's
// questions. The CV goes up first (progress, cancel, retry), then the application. Email is sent exactly as typed.
// D32: 17/600 headings, errors under their fields (no toast), Submit in the sticky bar.
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { CustomFieldResponses } from '@/api/schemas/applications';
import { Button } from '@/components/ui/Button';
import { StickyActionBar } from '@/components/ui/StickyActionBar';
import { AppText } from '@/components/ui/Text';
import { TextInput } from '@/components/ui/TextInput';
import { FilePickerField } from '@/features/uploads/components/FilePickerField';
import { validateCvFile } from '@/features/uploads/logic/files';
import { pickCv } from '@/features/uploads/pickers';
import type { PickedAsset } from '@/features/uploads/uploadsApi';
import { spacing } from '@/theme/tokens';

import { ApplyBody, ApplyFrame, type ApplyReady } from '../components/ApplyFrame';
import { ApplyingForCard } from '../components/ApplyingForCard';
import { JobQuestionsForm } from '../components/JobQuestionsForm';
import { useApplyWithCv } from '../hooks/useApply';
import { type UploadApplyField, uploadApplyError } from '../logic/apply';
import { type AnswerProblem, answersForSubmit, firstProblem } from '../logic/customFields';

const PREFIX = 'apply.upload';

export function ApplyUploadScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const router = useRouter();
  const back = () =>
    router.canGoBack() ? router.back() : router.replace({ pathname: '/apply/[jobId]', params: { jobId } });
  return (
    <ApplyFrame
      prefix={PREFIX}
      jobId={jobId}
      appliedMessage={(job) => `You have already submitted an application for ${job.role}.`}
    >
      {(ready) =>
        ready.hasFormCv ? <UploadForm {...ready} /> : <FormRequired jobId={ready.job.id} onBack={back} />
      }
    </ApplyFrame>
  );
}

function FormRequired({ jobId, onBack }: { jobId: string; onBack: () => void }) {
  const router = useRouter();
  return (
    <ApplyBody prefix={PREFIX}>
      <View testID="apply.upload.locked" style={styles.center}>
        <AppText variant="heading" align="center">
          Structured Form Required
        </AppText>
        <AppText color="mutedForeground" align="center">
          To maintain quality profiles for recruiters, candidates are not allowed to apply by CV upload
          without first completing the structured form.
        </AppText>
        <View style={styles.row}>
          <Button
            testID="apply.upload.locked.back"
            label="Back"
            variant="secondary"
            size="md"
            fullWidth={false}
            onPress={onBack}
          />
          <Button
            testID="apply.upload.locked.form"
            label="Start structured form"
            size="md"
            fullWidth={false}
            onPress={() => router.push({ pathname: '/apply/[jobId]/form', params: { jobId } })}
          />
        </View>
      </View>
    </ApplyBody>
  );
}

function UploadForm({ job, me }: ApplyReady) {
  const router = useRouter();
  const apply = useApplyWithCv();
  const [name, setName] = useState(me?.name ?? '');
  const [email, setEmail] = useState(me?.email ?? '');
  const [phone, setPhone] = useState(me?.phone ?? String(me?.profile?.phone ?? ''));
  const [file, setFile] = useState<PickedAsset>();
  const [fileError, setFileError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<UploadApplyField, string>>>({});
  const [answers, setAnswers] = useState<CustomFieldResponses>({});
  const [problem, setProblem] = useState<AnswerProblem>();
  const fields = job.customApplicationFields;
  const busy = apply.status.state === 'uploading';

  const choose = async () => {
    const result = await pickCv();
    if (result.kind === 'cancelled') return;
    if (result.kind !== 'picked') {
      setFileError(result.kind === 'error' ? result.message : 'Could not open your files. Please try again.');
      return;
    }
    const picked = result.files[0];
    if (!picked) return;
    const problem = validateCvFile(picked);
    setFileError(problem);
    setFile(problem ? undefined : picked);
  };

  const finish = async (run: Promise<{ ok: boolean }>) => {
    if ((await run).ok) router.replace('/applications');
  };

  const submit = () => {
    // Website order, first problem only; each message sits under its own field (D32).
    const contactProblem = uploadApplyError({ name, email, phone });
    if (contactProblem) {
      setFieldErrors({ [contactProblem.field]: contactProblem.message });
      return;
    }
    setFieldErrors({});
    if (!file) {
      setFileError('Please upload your CV (PDF or Word document)');
      return;
    }
    const found = firstProblem(fields, answers);
    setProblem(found ?? undefined);
    if (found) return;
    void finish(
      apply.submit({
        jobId: job.id,
        file,
        contact: { name, email, phone },
        answers: answersForSubmit(fields, answers),
      }),
    );
  };

  return (
    <ApplyBody
      prefix={PREFIX}
      bar={
        <StickyActionBar testID="apply.upload.bar">
          <Button
            testID="apply.upload.submit"
            label={busy ? 'Submitting…' : 'Submit application'}
            accessibilityLabel="Submit application"
            loading={busy}
            haptic="medium"
            onPress={submit}
          />
        </StickyActionBar>
      }
    >
      <ApplyingForCard job={job} />
      <View style={styles.gap}>
        <AppText variant="heading">{`Upload CV · ${job.role}`}</AppText>
        <AppText color="mutedForeground">
          Submit a PDF or Word document — this application uses your uploaded file, not the structured form.
        </AppText>
      </View>

      <View style={styles.fields}>
        <TextInput
          testID="apply.upload.name"
          label="Full name"
          value={name}
          onChangeText={setName}
          error={fieldErrors.name}
          editable={!busy}
          autoCapitalize="words"
          textContentType="name"
          returnKeyType="next"
        />
        <TextInput
          testID="apply.upload.email"
          label="Email"
          value={email}
          onChangeText={setEmail}
          error={fieldErrors.email}
          editable={!busy}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="emailAddress"
          returnKeyType="next"
        />
        <TextInput
          testID="apply.upload.phone"
          label="Phone"
          value={phone}
          onChangeText={setPhone}
          error={fieldErrors.phone}
          editable={!busy}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          returnKeyType="done"
        />
      </View>

      <FilePickerField
        testID="apply.upload.file"
        title="Choose your CV"
        hint="PDF or Word (.pdf, .doc, .docx), up to 5MB"
        files={file ? [file] : []}
        sources={['files']}
        single
        onPick={() => void choose()}
        onRemove={() => {
          setFile(undefined);
          setFileError(undefined);
        }}
        onCancel={apply.cancel}
        onRetry={() => void finish(apply.retry())}
        upload={apply.status}
        error={fileError}
        disabled={busy}
      />

      <JobQuestionsForm
        testID="apply.upload.questions"
        title="Additional questions from the recruiter"
        fields={fields}
        values={answers}
        onChange={(next) => {
          setAnswers(next);
          setProblem(undefined);
        }}
        disabled={busy}
        problem={problem}
      />
    </ApplyBody>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: spacing['3'], paddingVertical: spacing['6'] },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing['3'], justifyContent: 'center' },
  gap: { gap: spacing['2'] },
  // D32: fields 20 apart inside a group.
  fields: { gap: spacing['5'] },
});
