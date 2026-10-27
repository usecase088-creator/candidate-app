// Apply: quick apply with the saved profile, and apply with an uploaded CV (website: lib/applications.ts).
// Server is the truth: nothing is changed on screen before the answer (unlike saving a job).
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';

import { isApiError } from '@/api/errors';
import type { CustomFieldResponses, UploadedFile } from '@/api/schemas/applications';
import type { CandidateMe } from '@/api/schemas/candidate';
import { useToast } from '@/components/ui/Toast';
import { useUploadTask } from '@/features/uploads/hooks/useUploadTask';
import { uploadCv, type PickedAsset } from '@/features/uploads/uploadsApi';

import { applicationsApi, type ApplyContact } from '../applicationsApi';
import { failureText, isConflict } from '../messages';
import { APPLICATIONS_KEY } from './queryKeys';

const QUICK_KEY = ['apply', 'quick'] as const;

type QuickVars = { jobId: string; me: CandidateMe; answers?: CustomFieldResponses };

export function useQuickApply() {
  const client = useQueryClient();
  const toast = useToast();
  const refresh = () => client.invalidateQueries({ queryKey: APPLICATIONS_KEY });

  const mutation = useMutation({
    mutationKey: QUICK_KEY,
    mutationFn: ({ jobId, me, answers }: QuickVars) => applicationsApi.quickApply(jobId, me, answers),
    onSuccess: () => {
      toast.show('Application submitted!', { variant: 'success' });
      void refresh();
    },
    onError: (error) => {
      toast.show(failureText(error, 'Failed to submit application', { reasonOnly: true }), {
        variant: 'error',
      });
      // 409: the list must now show the application, so the screen can say "Already applied".
      if (isConflict(error)) void refresh();
    },
  });

  const { mutate } = mutation;
  const guarded = useCallback(
    (vars: QuickVars) => {
      if (client.isMutating({ mutationKey: QUICK_KEY }) > 0) return;
      mutate(vars);
    },
    [client, mutate],
  );

  return { ...mutation, mutate: guarded };
}

export type CvApplyInput = {
  jobId: string;
  file: PickedAsset;
  contact: ApplyContact;
  answers?: CustomFieldResponses;
};

export type CvApplyOutcome = { ok: true } | { ok: false; cancelled: boolean };

/**
 * Upload the CV, then apply with it. Progress, cancel and retry come from useUploadTask. If the CV went up but the
 * application was refused (a job question, say), retry applies again without sending the file a second time.
 */
export function useApplyWithCv() {
  const client = useQueryClient();
  const toast = useToast();
  const task = useUploadTask('Failed to upload CV file');
  const last = useRef<CvApplyInput | null>(null);
  const uploaded = useRef<{ uri: string; cv: UploadedFile } | null>(null);

  const perform = useCallback(
    async (input: CvApplyInput): Promise<CvApplyOutcome> => {
      const run = await task.run(async (options) => {
        let cv = uploaded.current?.uri === input.file.uri ? uploaded.current.cv : undefined;
        if (!cv) {
          cv = await uploadCv(input.file, options);
          uploaded.current = { uri: input.file.uri, cv };
        }
        try {
          return await applicationsApi.applyWithCv(input.jobId, cv, input.contact, input.answers, {
            name: input.file.name,
            mime: input.file.mime ?? undefined,
          });
        } catch (error) {
          if (isApiError(error) && error.kind === 'http' && (error.status ?? 0) >= 500) {
            throw new Error('Failed to submit application');
          }
          throw error;
        }
      });
      if (run.ok) {
        toast.show('Application submitted with your CV!', { variant: 'success' });
        void client.invalidateQueries({ queryKey: APPLICATIONS_KEY });
        return { ok: true };
      }
      if (!run.cancelled && isConflict(run.error))
        void client.invalidateQueries({ queryKey: APPLICATIONS_KEY });
      return { ok: false, cancelled: run.cancelled };
    },
    [client, task, toast],
  );

  const submit = useCallback(
    (input: CvApplyInput) => {
      last.current = input;
      return perform(input);
    },
    [perform],
  );

  const retry = useCallback(async (): Promise<CvApplyOutcome> => {
    if (!last.current) return { ok: false, cancelled: true };
    return perform(last.current);
  }, [perform]);

  return { submit, retry, cancel: task.cancel, status: task.status };
}
