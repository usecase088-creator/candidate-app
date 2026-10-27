// The candidate's answers: accept, decline or reschedule an interview, accept or reject an offer, upload the documents a
// hospital asked for (website: features/applications/CandidateActionCard.tsx). The server decides what is allowed, so
// the screen waits for its answer and then reloads the list.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';

import { useToast } from '@/components/ui/Toast';
import { useUploadTask } from '@/features/uploads/hooks/useUploadTask';
import { type PickedAsset, uploadApplicationDocuments } from '@/features/uploads/uploadsApi';

import { applicationsApi } from '../applicationsApi';
import { failureText } from '../messages';
import { APPLICATIONS_KEY } from './queryKeys';

const RESPOND_KEY = ['applications', 'respond'] as const;

type RespondVars = { id: string; status: string; note?: string };

export function useRespond() {
  const client = useQueryClient();
  const toast = useToast();
  const refresh = () => client.invalidateQueries({ queryKey: APPLICATIONS_KEY });

  const mutation = useMutation({
    mutationKey: RESPOND_KEY,
    mutationFn: ({ id, status, note }: RespondVars) => applicationsApi.respond(id, status, note),
    onSuccess: () => {
      toast.show('Response recorded successfully!', { variant: 'success' });
      void refresh();
    },
    onError: (error) => {
      toast.show(failureText(error, 'Failed to update status'), { variant: 'error' });
      // The application may have moved on without us (the hospital changed it): show what is true now.
      void refresh();
    },
  });

  const { mutate } = mutation;
  const guarded = useCallback(
    (vars: RespondVars) => {
      // A second tap on the same application while its request runs is ignored.
      const running = client
        .getMutationCache()
        .findAll({ mutationKey: RESPOND_KEY, status: 'pending' })
        .some((m) => (m.state.variables as RespondVars | undefined)?.id === vars.id);
      if (!running) mutate(vars);
    },
    [client, mutate],
  );

  return { ...mutation, mutate: guarded };
}

export type DocumentsOutcome = { ok: true } | { ok: false; cancelled: boolean };

/** Upload the requested documents of one application, with progress, cancel and retry. */
export function useUploadRequestedDocuments() {
  const client = useQueryClient();
  const toast = useToast();
  const task = useUploadTask('Failed to upload documents');
  const last = useRef<{ applicationId: string; files: PickedAsset[] } | null>(null);

  const perform = useCallback(
    async (applicationId: string, files: PickedAsset[]): Promise<DocumentsOutcome> => {
      const run = await task.run((options) => uploadApplicationDocuments(applicationId, files, options));
      if (run.ok) {
        toast.show('Documents uploaded successfully!', { variant: 'success' });
        void client.invalidateQueries({ queryKey: APPLICATIONS_KEY });
        return { ok: true };
      }
      return { ok: false, cancelled: run.cancelled };
    },
    [client, task, toast],
  );

  const submit = useCallback(
    (applicationId: string, files: PickedAsset[]) => {
      last.current = { applicationId, files };
      return perform(applicationId, files);
    },
    [perform],
  );

  const retry = useCallback(async (): Promise<DocumentsOutcome> => {
    if (!last.current) return { ok: false, cancelled: true };
    return perform(last.current.applicationId, last.current.files);
  }, [perform]);

  return { submit, retry, cancel: task.cancel, status: task.status };
}
