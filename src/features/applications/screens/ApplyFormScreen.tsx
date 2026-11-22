// "Start form" / "Edit & apply" (website routes/apply.$jobId.form.tsx): the profile form in apply mode for this job, or
// the "Already applied" page. Loading, offline, errors and "Job not found" come from ApplyFrame; the form itself, its
// questions and the submit are in ProfileBuilderScreen (ApplyProfileForm).
import { useLocalSearchParams } from 'expo-router';

import { ApplyProfileForm } from '@/features/profile/screens/ProfileBuilderScreen';

import { ApplyFrame } from '../components/ApplyFrame';

export function ApplyFormScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  return (
    <ApplyFrame
      prefix="apply.form"
      jobId={jobId}
      bare
      appliedMessage={(job) => `You have already submitted an application for ${job.role}.`}
    >
      {({ job, me }) => (me ? <ApplyProfileForm me={me} job={job} /> : null)}
    </ApplyFrame>
  );
}
