// What the apply screens need to know before they show anything: the job, whether the candidate already applied, and
// the candidate row with the saved profile (website: routes/apply.$jobId.tsx loader + profile store).
import { type QueryView, queryView } from '@/features/jobs/hooks/queryView';
import { useJob } from '@/features/jobs/hooks/useJobsData';

import { alreadyApplied, hasFormCv } from '../logic/apply';
import { useApplications, useApplyProfile } from './useApplications';

export function useApplyContext(jobId: string) {
  const job = useJob(jobId);
  const applications = useApplications();
  const me = useApplyProfile();

  const jobView = queryView(job);
  const meView = queryView(me);
  // The list of applications only decides "Already applied". If it cannot be loaded the website lets the candidate go
  // on (the server refuses a second application), so only its first load is waited for.
  const waitingForList = applications.status === 'pending' && applications.fetchStatus === 'fetching';

  let view: QueryView = jobView;
  if (jobView === 'ready') view = meView === 'ready' && waitingForList ? 'loading' : meView;

  return {
    view,
    job: job.data,
    jobError: job.error,
    meError: me.error,
    me: me.data,
    hasFormCv: hasFormCv(me.data),
    alreadyApplied: alreadyApplied(applications.data, jobId),
    retry: () => {
      void (jobView === 'ready' ? me.refetch() : job.refetch());
    },
    retrying: job.isFetching || me.isFetching,
  };
}
