import {
  application,
  applicantMe,
  applied,
  documentsRequested,
  documentsUploaded,
  interviewVirtual,
  jobQuestions,
  seededApplications,
} from '@/test/fixtures/applications';
import { publicJob } from '@/test/fixtures/jobs';

import {
  ApplicationDocumentListSchema,
  ApplicationListSchema,
  ApplicationSchema,
  CustomFieldSchema,
  UploadedFileListSchema,
  UploadedFileSchema,
} from '../applications';
import { CandidateMeSchema } from '../candidate';
import { JobSchema } from '../jobs';

describe('ApplicationSchema', () => {
  it('parses every seeded state', () => {
    const list = ApplicationListSchema.parse(seededApplications);
    expect(list).toHaveLength(8);
    expect(list.map((a) => a.status)).toEqual(expect.arrayContaining(['Applied', 'OfferSent', 'Rejected']));
  });

  it('keeps what the screens read: job, interview, documents, offer, joining', () => {
    const a = ApplicationSchema.parse(interviewVirtual);
    expect(a.job).toMatchObject({
      role: 'Emergency Physician',
      hospital: 'Seed City Multispeciality Hospital',
    });
    expect(a).toMatchObject({
      interviewType: 'Virtual',
      meetingLink: 'https://example.org/meet/seed-interview',
      interviewerName: 'Dr. Seed Interviewer',
    });
    const d = ApplicationSchema.parse(documentsRequested);
    expect(d.requestedDocumentList).toEqual([
      'Medical registration certificate',
      'Experience letter',
      'Identity proof',
    ]);
    expect(ApplicationSchema.parse(documentsUploaded).applicationDocuments[0]).toMatchObject({
      name: 'Degree certificate',
      url: 'https://example.org/docs/degree-seed.pdf',
    });
  });

  it('lists the backend sends as null or leaves out become empty lists', () => {
    const a = ApplicationSchema.parse(
      application({
        requestedDocumentList: null,
        supportingDocuments: null,
        applicationDocuments: undefined,
      }),
    );
    expect(a.requestedDocumentList).toEqual([]);
    expect(a.supportingDocuments).toEqual([]);
    expect(a.applicationDocuments).toEqual([]);
  });

  it('a job without job questions has an empty list of them', () => {
    const a = ApplicationSchema.parse(application({ job: { customApplicationFields: undefined } }));
    expect(a.job.customApplicationFields).toEqual([]);
  });

  it('extra fields are fine and stay (.loose)', () => {
    const a = ApplicationSchema.parse({ ...applied, somethingNew: 1 });
    expect((a as Record<string, unknown>).somethingNew).toBe(1);
  });

  it('a missing status, id or job throws (the backend shape changed)', () => {
    const { status: _s, ...noStatus } = applied;
    const { id: _i, ...noId } = applied;
    const { job: _j, ...noJob } = applied;
    expect(() => ApplicationSchema.parse(noStatus)).toThrow();
    expect(() => ApplicationSchema.parse(noId)).toThrow();
    expect(() => ApplicationSchema.parse(noJob)).toThrow();
  });

  it('numbers and dates the screens format may be missing without breaking the row', () => {
    const a = ApplicationSchema.parse(
      application({ matchPercent: undefined, interviewRound: undefined, appliedOn: undefined }),
    );
    expect(a.id).toBe(applied.id);
  });
});

describe('job questions', () => {
  it('parse for every field type', () => {
    for (const f of jobQuestions)
      expect(CustomFieldSchema.parse(f)).toMatchObject({ id: f.id, type: f.type });
  });

  it('an unknown field type does not break the job (the screen shows it as plain text)', () => {
    expect(CustomFieldSchema.parse({ id: 'x', label: 'X', type: 'date', required: false }).type).toBe('date');
  });

  it('required defaults to false', () => {
    expect(CustomFieldSchema.parse({ id: 'x', label: 'X', type: 'text' }).required).toBe(false);
  });

  it('the job details schema carries them (apply chooser reads them from GET /api/jobs/:id)', () => {
    const job = JobSchema.parse({ ...publicJob, customApplicationFields: jobQuestions });
    expect(job.customApplicationFields).toHaveLength(5);
    expect(JobSchema.parse(publicJob).customApplicationFields).toEqual([]);
  });
});

describe('uploads', () => {
  it('POST /api/upload/cv: { url, publicId, name, mime }', () => {
    const body = {
      url: 'https://res.example.test/cv.pdf',
      publicId: 'cv/abc',
      name: 'cv.pdf',
      mime: 'application/pdf',
    };
    expect(UploadedFileSchema.parse(body)).toEqual(body);
    expect(UploadedFileListSchema.parse([body])).toHaveLength(1);
  });

  it('a missing url throws', () => {
    expect(() => UploadedFileSchema.parse({ publicId: 'x' })).toThrow();
  });

  it('POST /api/applications/:id/documents: a list of application documents', () => {
    const docs = ApplicationDocumentListSchema.parse([
      {
        id: 'd1',
        applicationId: 'a1',
        name: 'Id',
        url: 'https://x.test/a.pdf',
        cloudinaryId: 'c',
        mime: 'application/pdf',
        uploadedBy: 'CANDIDATE',
        uploadedAt: '2026-10-27T10:00:00.000Z',
      },
    ]);
    expect(docs[0]).toMatchObject({ name: 'Id', uploadedBy: 'CANDIDATE' });
  });
});

describe('GET /api/candidates/me for applying', () => {
  it('keeps the whole profile exactly as received, including keys the app does not know', () => {
    const me = CandidateMeSchema.parse(applicantMe);
    expect(me.profile).toMatchObject({ completeness: 94, futureFlag: { keep: 'me' } });
    expect(me.cvSource).toBe('form');
  });

  it('reads the CV and avatar fields the website adds to the profile before sending it', () => {
    const me = CandidateMeSchema.parse({
      ...applicantMe,
      cvUrl: 'https://x.test/cv.pdf',
      avatarUrl: 'https://x.test/a.png',
      avatarCloudinaryId: 'av',
      uploadedCvName: 'cv.pdf',
    });
    expect(me).toMatchObject({
      cvUrl: 'https://x.test/cv.pdf',
      avatarUrl: 'https://x.test/a.png',
      avatarCloudinaryId: 'av',
      uploadedCvName: 'cv.pdf',
    });
  });

  it('a candidate without a profile (never filled the form) parses, with profile null', () => {
    expect(CandidateMeSchema.parse({ id: 'c1', profile: null, cvSource: null }).profile).toBeNull();
  });
});
