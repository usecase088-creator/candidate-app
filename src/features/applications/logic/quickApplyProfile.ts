// Pure: no React Native imports, so the contract tests (Node) can use it too.
import type { CandidateMe } from '@/api/schemas/candidate';

/**
 * The profile quick apply sends: what the server gave us in `profile`, plus the CV and avatar fields the website adds
 * when it loads the profile (lib/hydrate.ts). The server stores it as the candidate's profile, so nothing is removed and
 * nothing is invented here: unknown keys travel back untouched. The row we were given is not changed.
 */
export function buildQuickApplyProfile(me: CandidateMe): Record<string, unknown> {
  const profile = me.profile;
  if (!profile) throw new Error('This candidate has no profile, quick apply is not available.');
  return {
    ...profile,
    cvUrl: me.cvUrl,
    avatarUrl: me.avatarUrl || profile.avatarUrl,
    avatarCloudinaryId: me.avatarCloudinaryId || profile.avatarCloudinaryId,
    uploadedCvName: me.uploadedCvName,
    uploadedCvData: me.uploadedCvData,
    cvSource: me.cvSource,
  };
}
