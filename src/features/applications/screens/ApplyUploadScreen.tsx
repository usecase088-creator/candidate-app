// "Apply with your own CV" (website: routes/apply.$jobId.upload.tsx): contact details, one PDF or Word file, the job's
// questions. The CV goes up first (progress, cancel, retry), then the application. Email is sent exactly as typed.
// D32: 17/600 headings, errors under their fields (no toast), Submit in the sticky bar.
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { CustomFieldResponses } from '@/api/schemas/applications';
import { Button } from '@/components/ui/Button';
import { StickyActionBar } from '@/components/ui/StickyActionBar';
import { AppText } from '@/components/ui/Text';
import { TextInput, type TextInputRef } from '@/components/ui/TextInput';
import { useFieldScroll } from '@/components/ui/useFieldScroll';
import { announce } from '@/lib/announce';
import { haptic } from '@/lib/haptics';
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
  const { scrollRef, onLayoutOf, scrollToField } = useFieldScroll();
  const emailRef = useRef<TextInputRef>(null);
  const phoneRef = useRef<TextInputRef>(null);

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

  /**
   * R3 #1: the message sits under its field, maybe off-screen: bring the field into view, buzz "error" and speak it.
   * A field speaks a new message itself; the same message again (a second refused tap) is spoken here.
   */
  const refuse = (path: string[], message: string, shown: string | undefined) => {
    haptic('error');
    if (shown === message) announce(message);
    scrollToField(path);
  };

  const submit = () => {
    // Website order, first problem only; each message sits under its own field (D32).
    const contactProblem = uploadApplyError({ name, email, phone });
    if (contactProblem) {
      refuse(['fields', contactProblem.field], contactProblem.message, fieldErrors[contactProblem.field]);
      setFieldErrors({ [contactProblem.field]: contactProblem.message });
      return;
    }
    setFieldErrors({});
    if (!file) {
      const message = 'Please upload your CV (PDF or Word document)';
      refuse(['file'], message, fileError);
      setFileError(message);
      return;
    }
    const found = firstProblem(fields, answers);
    if (found) {
      const same = problem?.fieldId === found.fieldId ? problem.message : undefined;
      refuse(['questions', found.fieldId], found.message, same);
      setProblem(found);
      return;
    }
    setProblem(undefined);
    haptic('medium');
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
      scrollRef={scrollRef}
      bar={
        <StickyActionBar testID="apply.upload.bar">
          <Button
            testID="apply.upload.submit"
            label={busy ? 'Submitting…' : 'Submit application'}
            accessibilityLabel="Submit application"
            loading={busy}
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

      <View testID="apply.upload.fields" style={styles.fields} onLayout={onLayoutOf('fields')}>
        <View testID="apply.upload.name.block" onLayout={onLayoutOf('name')}>
          <TextInput
            testID="apply.upload.name"
            label="Full name"
            required
            value={name}
            onChangeText={setName}
            error={fieldErrors.name}
            editable={!busy}
            autoCapitalize="words"
            textContentType="name"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => emailRef.current?.focus()}
          />
        </View>
        <View testID="apply.upload.email.block" onLayout={onLayoutOf('email')}>
          <TextInput
            ref={emailRef}
            testID="apply.upload.email"
            label="Email"
            required
            value={email}
            onChangeText={setEmail}
            error={fieldErrors.email}
            editable={!busy}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="emailAddress"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => phoneRef.current?.focus()}
          />
        </View>
        <View testID="apply.upload.phone.block" onLayout={onLayoutOf('phone')}>
          <TextInput
            ref={phoneRef}
            testID="apply.upload.phone"
            label="Phone"
            required
            value={phone}
            onChangeText={setPhone}
            error={fieldErrors.phone}
            editable={!busy}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            returnKeyType="done"
          />
        </View>
      </View>

      <View testID="apply.upload.file.block" onLayout={onLayoutOf('file')}>
        <FilePickerField
          testID="apply.upload.file"
          title="Tap to upload your CV"
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
      </View>

      {fields.length > 0 ? (
        <View onLayout={onLayoutOf('questions')}>
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
            onLayoutOf={onLayoutOf}
          />
        </View>
      ) : null}
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
