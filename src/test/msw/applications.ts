// A small stand-in for the applications backend, for hook and screen tests (Phase 3). State changes like the real
// server's: apply adds a row (409 for a second time), an answer moves the status along the candidate rules (API.md §19),
// documents and CV uploads work. Uploads arrive through the XHR-over-fetch helper (src/test/xhrOverFetch.ts).
import { http, HttpResponse } from 'msw';

import type { Application } from '@/api/schemas/applications';
import { type ApplicationFixture, application } from '@/test/fixtures/applications';

import { API } from './handlers';
import { server } from './server';

const fieldNames = (form: unknown) => [...new Set([...(form as { keys(): Iterable<string> }).keys()])];

export type ApplicationsBackend = {
  /** Newest first, like the real list. */
  apps: ApplicationFixture[];
  /** Requests seen, e.g. `PATCH /api/applications/a1`. */
  calls: string[];
  /** Bodies of the JSON requests, by call. */
  bodies: unknown[];
  /** Field names of multipart requests, by call. */
  forms: string[][];
};

const CANDIDATE_MOVES: Record<string, string[]> = {
  InterviewScheduled: ['InterviewAccepted', 'InterviewDeclined', 'RescheduleRequested'],
  DocumentsRequested: ['DocumentsUploaded'],
  AdditionalDocumentsRequired: ['DocumentsUploaded'],
  OfferSent: ['OfferAccepted', 'OfferRejected'],
};
const FINAL = [
  'OfferRejected',
  'Rejected',
  'InterviewDeclined',
  'DocumentsRejected',
  'Dropped',
  'Onboarded',
  'JobClosed',
];

export function installApplicationsBackend(initial: Partial<ApplicationsBackend> = {}): ApplicationsBackend {
  const b: ApplicationsBackend = { apps: [], calls: [], bodies: [], forms: [], ...initial };
  const note = (method: string, url: string) => b.calls.push(`${method} ${new URL(url).pathname}`);

  server.use(
    http.get(`${API}/api/applications`, ({ request }) => {
      note('GET', request.url);
      return HttpResponse.json(b.apps as never);
    }),

    http.post(`${API}/api/applications`, async ({ request }) => {
      note('POST', request.url);
      const body = (await request.json()) as { jobId?: string; cvSource?: string };
      b.bodies.push(body);
      if (!body.jobId) return HttpResponse.json({ error: 'jobId is required' }, { status: 400 });
      if (b.apps.some((a) => a.jobId === body.jobId)) {
        return HttpResponse.json({ error: 'You have already applied to this job' }, { status: 409 });
      }
      const row = application({
        id: `new-${b.apps.length + 1}`,
        status: 'Applied',
        appliedOn: new Date().toISOString(),
        cvSource: body.cvSource ?? 'form',
        job: { id: body.jobId, role: 'Applied job', hospital: 'Seed Hospital' },
      });
      b.apps.unshift(row);
      return HttpResponse.json(row as never, { status: 201 });
    }),

    http.patch(`${API}/api/applications/:id`, async ({ request, params }) => {
      note('PATCH', request.url);
      const body = (await request.json()) as { status?: string; candidateResponseNote?: string };
      b.bodies.push(body);
      const row = b.apps.find((a) => a.id === params.id);
      if (!row) return HttpResponse.json({ error: 'Application not found' }, { status: 404 });
      if (FINAL.includes(row.status)) {
        return HttpResponse.json(
          { error: `Application status "${row.status}" is final and cannot be changed.` },
          { status: 400 },
        );
      }
      const allowed = CANDIDATE_MOVES[row.status] ?? [];
      if (!body.status || !allowed.includes(body.status)) {
        return HttpResponse.json(
          {
            error: `Cannot move from "${row.status}" to "${body.status}" as CANDIDATE. Allowed: ${allowed.join(', ') || 'none'}.`,
          },
          { status: 400 },
        );
      }
      if (body.status === 'RescheduleRequested' && !body.candidateResponseNote?.trim()) {
        return HttpResponse.json({ error: 'A reason is required to request a reschedule' }, { status: 400 });
      }
      row.status = body.status;
      if (body.candidateResponseNote) row.candidateResponseNote = body.candidateResponseNote;
      return HttpResponse.json(row as never);
    }),

    http.post(`${API}/api/applications/:id/documents`, async ({ request, params }) => {
      note('POST', request.url);
      b.forms.push(fieldNames(await request.formData()));
      const row = b.apps.find((a) => a.id === params.id);
      if (!row) return HttpResponse.json({ error: 'Application not found' }, { status: 404 });
      if (!['DocumentsRequested', 'AdditionalDocumentsRequired'].includes(row.status)) {
        return HttpResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      const docs = [
        {
          id: `doc-${Date.now()}`,
          applicationId: row.id,
          name: 'Uploaded document',
          url: 'https://example.org/docs/uploaded.pdf',
          cloudinaryId: 'seed/uploaded',
          mime: 'application/pdf',
          uploadedBy: 'CANDIDATE',
          uploadedAt: new Date().toISOString(),
        },
      ];
      row.status = 'DocumentsUploaded';
      row.applicationDocuments = [...row.applicationDocuments, ...docs];
      return HttpResponse.json(docs, { status: 201 });
    }),

    http.post(`${API}/api/upload/cv`, async ({ request }) => {
      note('POST', request.url);
      b.forms.push(fieldNames(await request.formData()));
      return HttpResponse.json({
        url: 'https://example.org/cv/uploaded.pdf',
        publicId: 'candidates/cv/test_1',
        name: 'uploaded.pdf',
        mime: 'application/pdf',
      });
    }),
  );
  return b;
}

export type { Application };
