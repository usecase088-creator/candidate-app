import type { Page, Route } from '@playwright/test';
import { expect } from '@playwright/test';

// Shared by the apply and applications web specs (PHASE-3 Task 9): application fixtures and a stateful stand-in for
// the applications endpoints, mocked in the browser on top of the jobs backend of jobsHelpers. The real backend is
// covered by tests/contract and the phone flows (e2e/maestro). Never calls production.
const API = 'http://localhost:3000';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
};

export const application = (over: Record<string, unknown> & { id: string }) => ({
  status: 'Applied',
  appliedOn: '2026-10-25T14:03:43.538Z',
  cvSource: 'form',
  interviewDate: null,
  interviewType: null,
  meetingLink: null,
  venue: null,
  interviewerName: null,
  requestedDocumentList: [],
  documentRequestNote: null,
  applicationDocuments: [],
  supportingDocuments: [],
  offerLetterUrl: null,
  joiningDate: null,
  joiningNote: null,
  finalStatusNote: null,
  jobId: 'old-1',
  job: {
    id: 'old-1',
    role: 'ICU Nurse',
    hospital: 'Seed City Hospital',
    city: 'Kolkata',
    location: 'Kolkata, West Bengal',
    status: 'Closed',
    customApplicationFields: [],
  },
  ...over,
});

export const interview = application({
  id: 'a-interview',
  status: 'InterviewScheduled',
  appliedOn: '2026-10-21T14:03:43.538Z',
  interviewDate: '2026-10-30T14:00:00.000Z',
  interviewType: 'Virtual',
  meetingLink: 'https://example.org/meet/seed-interview',
  interviewerName: 'Dr. Seed Interviewer',
  jobId: 'old-2',
  job: {
    id: 'old-2',
    role: 'Emergency Physician',
    hospital: 'Seed City Hospital',
    city: 'Kolkata',
    location: 'Kolkata',
    status: 'Closed',
    customApplicationFields: [],
  },
});

export const offer = application({
  id: 'a-offer',
  status: 'OfferSent',
  appliedOn: '2026-10-13T14:03:43.538Z',
  offerLetterUrl: 'https://example.org/offer-letter-seed.pdf',
  jobId: 'old-3',
  job: {
    id: 'old-3',
    role: 'Anaesthetist',
    hospital: 'Seed Valley Care Centre',
    city: 'Bengaluru',
    location: 'Bengaluru',
    status: 'Closed',
    customApplicationFields: [],
  },
});

export const profileMe = {
  id: 'c1',
  name: 'Demo Applicant',
  email: 'applicant@apronhanger.test',
  phone: '9876500088',
  cvSource: 'form',
  profile: {
    name: 'Demo Applicant',
    completeness: 94,
    role: 'Doctor',
    city: 'Kolkata',
    state: 'West Bengal',
    clinicalSkills: [],
    technicalSkills: [],
  },
};

const MOVES: Record<string, string[]> = {
  InterviewScheduled: ['InterviewAccepted', 'InterviewDeclined', 'RescheduleRequested'],
  OfferSent: ['OfferAccepted', 'OfferRejected'],
};

export type ApplicationsState = {
  apps: Record<string, unknown>[];
  posted: unknown[];
  patched: unknown[];
};

/** Call after mockBackend(page, jobs): answers the applications endpoints, passes everything else on. */
export async function mockApplications(
  page: Page,
  options: { apps?: Record<string, unknown>[]; me?: unknown } = {},
): Promise<ApplicationsState> {
  // Rows are copied: an answer changes the status in place, and a shared fixture must not leak into the next test.
  const state: ApplicationsState = {
    apps: (options.apps ?? []).map((a) => structuredClone(a)),
    posted: [],
    patched: [],
  };
  const json = (route: Route, status: number, body: unknown) =>
    route.fulfill({ status, headers: CORS, contentType: 'application/json', body: JSON.stringify(body) });

  await page.route(`${API}/api/**`, async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    const mine = path === '/api/applications' || path.startsWith('/api/applications/');
    const me = path === '/api/candidates/me' && options.me !== undefined;
    if (!mine && !me) return route.fallback();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });

    if (me) return json(route, 200, options.me);
    if (path === '/api/applications' && req.method() === 'GET') return json(route, 200, state.apps);
    if (path === '/api/applications' && req.method() === 'POST') {
      const body = req.postDataJSON() as { jobId: string };
      state.posted.push(body);
      if (state.apps.some((a) => a.jobId === body.jobId)) {
        return json(route, 409, { error: 'You have already applied to this job' });
      }
      const row = application({
        id: `new-${state.apps.length + 1}`,
        appliedOn: new Date().toISOString(),
        jobId: body.jobId,
        job: {
          id: body.jobId,
          role: 'Staff Nurse',
          hospital: 'Seed City Hospital',
          city: 'Kolkata',
          location: 'Kolkata',
          status: 'Active',
          customApplicationFields: [],
        },
      });
      state.apps.unshift(row);
      return json(route, 201, row);
    }
    if (req.method() === 'PATCH') {
      const id = path.split('/').pop();
      const body = req.postDataJSON() as { status: string };
      state.patched.push(body);
      const row = state.apps.find((a) => a.id === id);
      if (!row) return json(route, 404, { error: 'Application not found' });
      if (!(MOVES[String(row.status)] ?? []).includes(body.status)) {
        return json(route, 400, {
          error: `Cannot move from "${String(row.status)}" to "${body.status}" as CANDIDATE.`,
        });
      }
      row.status = body.status;
      return json(route, 200, row);
    }
    return json(route, 404, { error: `unmocked ${req.method()} ${path}` });
  });
  return state;
}

// The web build keeps the session in memory only (src/lib/secureStorage.web.ts), so a page.goto signs out. The specs
// therefore move around inside the app, the way a person does.

/** My Applications tab, then one application. */
export async function openApplication(page: Page, id: string) {
  await page.getByTestId('tabs.applications').click();
  await page.getByTestId(`application.row.${id}`).click();
  await expect(page.getByTestId('application.screen')).toBeVisible();
}

/** Home, a job, Apply Now: the apply chooser. */
export async function openApplyChooser(page: Page, jobId: string) {
  await page.getByTestId(`job.open.${jobId}`).click();
  await page.getByTestId('job.apply').click();
  await expect(page.getByTestId('apply.screen')).toBeVisible();
}
