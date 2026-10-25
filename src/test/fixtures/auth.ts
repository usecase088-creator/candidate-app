// Response bodies as the backend sends them (../job/backend/src/routes/authRoutes.ts, docs/reference/API.md).
// Shapes match the seeded local backend accounts (scripts/backend-local/overlay/app-scripts/seedData.ts).

export const candidateUser = {
  id: '1a3baa5d-97d1-4622-9dc1-b1c7195bfa3f',
  email: 'candidate@apronhanger.test',
  name: 'Test Candidate',
  role: 'CANDIDATE',
  hospitalId: null,
  candidateId: 'c0ffee00-0000-4000-8000-000000000001',
};

export const recruiterUser = {
  id: '3097c596-478e-4770-a4e1-b028e7007de8',
  email: 'recruiter@apronhanger.test',
  name: 'Test Recruiter',
  role: 'RECRUITER',
  hospitalId: '5eed0000-0000-4000-8000-00000000a001',
  candidateId: null,
};

/** POST /api/auth/login 200 */
export const loginResponse = { token: 'test.jwt.token', user: candidateUser };

/** GET /api/auth/me 200: the user plus recruiter plan fields and notification prefs. */
export const meResponse = {
  user: {
    ...candidateUser,
    jobsPostedThisMonth: 0,
    premiumSearchesThisMonth: 0,
    plan: 'Basic',
    jobValidityDays: 30,
    isLocked: false,
    isPlanSuspended: false,
    notifOnApply: true,
    notifWeekly: false,
    notifHighMatch: true,
  },
};
