// Saved jobs: the list, the set of saved ids, and save/unsave with an optimistic update.
// The website waits for the server before changing the icon; the app changes it at once and puts it back if the
// server says no (PLAN.md Phase 2). Texts are the website's (lib/savedJobs.ts, SaveJobButton.tsx).
import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { isApiError } from '@/api/errors';
import type { Job, SavedJob } from '@/api/schemas/jobs';
import { useToast } from '@/components/ui/Toast';

import { jobsApi } from '../jobsApi';
import { SAVED_JOBS_KEY } from './queryKeys';

export function useSavedJobs() {
  return useQuery({ queryKey: SAVED_JOBS_KEY, queryFn: jobsApi.savedList });
}

/** Ids of saved jobs, for the bookmark icons. Empty until the list has loaded. */
export function useSavedIdSet(): Set<string> {
  const { data } = useSavedJobs();
  return useMemo(() => new Set((data ?? []).map((s) => s.job.id)), [data]);
}

/** Newest first, like GET /api/saved-jobs. Touches only this job, so parallel saves don't undo each other. */
function setSaved(client: QueryClient, job: Job, saved: boolean) {
  client.setQueryData<SavedJob[]>(SAVED_JOBS_KEY, (list = []) => {
    const rest = list.filter((s) => s.job.id !== job.id);
    return saved ? [{ savedAt: new Date().toISOString(), job }, ...rest] : rest;
  });
}

const FAILED_TEXT = { save: 'Failed to save job', unsave: 'Failed to remove saved job' } as const;

function failureText(error: unknown, action: keyof typeof FAILED_TEXT): string {
  if (isApiError(error)) {
    if (error.serverMessage && (error.status ?? 0) < 500) return error.serverMessage;
    if (error.kind === 'network' || error.kind === 'timeout') return error.message;
  }
  return FAILED_TEXT[action];
}

/** 409 on save and 404 on unsave mean the job is already in the state the user asked for. */
const alreadyThere = (error: unknown, save: boolean) =>
  isApiError(error) && error.kind === 'http' && error.status === (save ? 409 : 404);

type Vars = { job: Job; save: boolean };

export function useToggleSave() {
  const client = useQueryClient();
  const toast = useToast();

  const mutation = useMutation({
    mutationFn: async ({ job, save }: Vars) => {
      if (save) await jobsApi.save(job.id);
      else await jobsApi.unsave(job.id);
    },
    onMutate: async ({ job, save }) => {
      await client.cancelQueries({ queryKey: SAVED_JOBS_KEY });
      setSaved(client, job, save);
    },
    onSuccess: (_data, { save }) =>
      toast.show(save ? 'Job saved' : 'Removed from saved jobs', { variant: 'success' }),
    onError: (error, { job, save }) => {
      if (alreadyThere(error, save)) {
        toast.show(save ? 'Job saved' : 'Removed from saved jobs', { variant: 'success' });
        return;
      }
      setSaved(client, job, !save);
      toast.show(failureText(error, save ? 'save' : 'unsave'), { variant: 'error' });
    },
    onSettled: () => {
      // Refetch only when nothing else is in flight, or it would overwrite another job's optimistic state.
      if (client.isMutating({ mutationKey: ['saved-jobs'] }) <= 1) {
        void client.invalidateQueries({ queryKey: SAVED_JOBS_KEY });
      }
    },
    mutationKey: ['saved-jobs'],
  });

  const toggle = useCallback(
    (job: Job) => {
      // Ignore a second tap on the same job while its request is running.
      if (
        client
          .getMutationCache()
          .findAll({ mutationKey: ['saved-jobs'], status: 'pending' })
          .some((m) => (m.state.variables as Vars | undefined)?.job.id === job.id)
      )
        return;
      const saved =
        client.getQueryData<SavedJob[]>(SAVED_JOBS_KEY)?.some((s) => s.job.id === job.id) ?? false;
      mutation.mutate({ job, save: !saved });
    },
    [client, mutation],
  );

  return { toggle };
}
