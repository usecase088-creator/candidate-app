/**
 * D32: every screen pushed over the tabs uses the native stack header (system back chevron + this title).
 * The job screen sets its own title once the job is loaded (the role), so it starts empty.
 * Kept in one place so the root layout and the tests agree.
 */
export const PUSHED_SCREEN_TITLES = {
  'job/[id]': '',
  'saved-jobs': 'Saved jobs',
  'gov-jobs': 'Government jobs',
  'intl-jobs': 'International jobs',
  notifications: 'Notifications',
  settings: 'Settings',
  'delete-account': 'Delete account',
  'profile-builder': 'Build your profile',
  'cv-preview': 'My CV',
  'application/[id]': 'Application',
  'apply/[jobId]/index': 'Apply',
  'apply/[jobId]/form': 'Application form',
  'apply/[jobId]/upload': 'Upload your CV',
  'dev-ui': 'Dev UI',
} as const;

export type PushedScreen = keyof typeof PUSHED_SCREEN_TITLES;
