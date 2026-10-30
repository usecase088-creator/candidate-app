import * as DocumentPicker from 'expo-document-picker';
import { useFonts } from 'expo-font';
import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { http, HttpResponse } from 'msw';

import type { CandidateMe } from '@/api/schemas/candidate';
import { useSession } from '@/features/auth/sessionStore';
import { applicantMe } from '@/test/fixtures/applications';
import { candidateUser } from '@/test/fixtures/auth';
import { fakePicker } from '@/test/fakeDateTimePicker';
import { fakeFiles, resetFakeFiles } from '@/test/fakeFileSystem';
import { API } from '@/test/msw/handlers';
import { installJobsBackend } from '@/test/msw/jobs';
import { server } from '@/test/msw/server';
import { resetAppState, startSignedIn } from '@/test/startSignedIn';
import { installXhrOverFetch } from '@/test/xhrOverFetch';

import { type BuilderDraft, loadDraft, saveDraft } from '../builder/draftStore';
import { draftFromMe } from '../builder/model';

jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: jest.fn() }));
jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn(() => Promise.resolve()),
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('expo-file-system', () => jest.requireActual('@/test/fakeFileSystem').fakeFileSystemModule);
jest.mock('@react-native-community/datetimepicker', () => jest.requireActual('@/test/fakeDateTimePicker'));

const USER = candidateUser.id;

const DOCTOR =
  'Clinical Practitioners & Super Specialists (MBBS/ MD Physician/ MD/MS / DM / MCh / DNB-SS etc)';

// A saved profile that passes every step, so tests can walk through.
const fullProfile = {
  ...applicantMe.profile,
  someOtherKey: 'keep me',
  role: DOCTOR,
  specialty: 'Cardiology',
  state: 'West Bengal',
  registrationCouncil: 'NMC',
  registrationNumber: 'WB/1',
  licenseStatus: 'Active',
  qualifications: [{ degree: 'MBBS', institution: 'CMC', year: '2012' }],
  experience: [
    {
      role: 'Consultant',
      hospital: 'AMRI',
      city: 'Kolkata',
      start: '2020-01-01',
      end: '',
      current: true,
      specialty: 'Cardiology',
      summary: '',
    },
  ],
  clinicalSkills: ['PTCA'],
  summary: 'Consultant cardiologist with seven years of tertiary-care experience.',
};
const meWith = (profile: unknown, over: Record<string, unknown> = {}) => ({
  ...applicantMe,
  profile,
  ...over,
});

let puts: { profile: Record<string, unknown>; supportingDocuments?: unknown[] }[];
function setup(me: unknown = meWith(fullProfile)) {
  puts = [];
  installJobsBackend({ me });
  server.use(
    http.put(`${API}/api/candidates/me`, async ({ request }) => {
      const body = (await request.json()) as {
        profile: Record<string, unknown>;
        supportingDocuments?: unknown[];
      };
      puts.push(body);
      return HttpResponse.json({ ...(me as object), profile: body.profile });
    }),
  );
}
const open = () => startSignedIn('/profile-builder', 'builder.screen');
const next = async () => fireEvent.press(await screen.findByTestId('builder.next'));
/** The phone already holds a draft at this step (index), filled from what the server has. */
const atStep = (step: number, me: unknown = meWith(fullProfile), over: Partial<BuilderDraft> = {}) =>
  saveDraft(USER, { step, draft: draftFromMe(me as CandidateMe), pending: [], uploaded: [], ...over });
const onPhone = () => loadDraft(USER);
const draftFiles = () => [...fakeFiles.keys()].filter((k) => k.includes('profile-drafts'));

let restoreXhr: () => void;
beforeAll(() => {
  restoreXhr = installXhrOverFetch();
});
afterAll(() => restoreXhr());
beforeEach(() => {
  resetAppState();
  resetFakeFiles();
  jest.mocked(useFonts).mockReturnValue([true, null]);
});

describe('Profile builder: first step', () => {
  it('starts at step 1 of 16 with the saved details, and shows the sign-in email and phone read-only', async () => {
    setup();
    await open();
    expect(await screen.findByTestId('builder.progress')).toHaveTextContent('Step 1 of 16');
    expect(screen.getByText('Basic Details')).toBeOnTheScreen();
    expect(screen.getByTestId('builder.field.fullName')).toHaveProp('value', 'Demo Applicant');
    expect(screen.getByTestId('builder.field.email')).toHaveTextContent('applicant@apronhanger.test');
    expect(screen.getByTestId('builder.field.phone')).toHaveTextContent('9876500088');
    expect(screen.queryByTestId('builder.back')).toBeNull();
  });

  it('shows the website message and saves nothing when the step is not valid', async () => {
    setup();
    await open();
    await fireEvent.changeText(await screen.findByTestId('builder.field.fullName'), '   ');
    await next();
    expect(await screen.findByText('Full name is required')).toBeOnTheScreen();
    expect(puts).toHaveLength(0);
  });

  it('Next keeps the step on the phone only: nothing is sent to the server before the last step (website)', async () => {
    setup();
    await open();
    await fireEvent.changeText(await screen.findByTestId('builder.field.fullName'), 'Dr. New Name');
    await next();
    expect(await screen.findByTestId('builder.progress')).toHaveTextContent('Step 2 of 16');
    await waitFor(async () => expect((await onPhone())?.step).toBe(1));
    expect((await onPhone())?.draft.fullName).toBe('Dr. New Name');
    expect(puts).toHaveLength(0);
  });

  it('Next works without a connection (nothing to send)', async () => {
    setup();
    server.use(http.put(`${API}/api/candidates/me`, () => HttpResponse.error()));
    await open();
    await next();
    expect(await screen.findByTestId('builder.progress')).toHaveTextContent('Step 2 of 16');
    expect(screen.queryByTestId('builder.error')).toBeNull();
  });
});

describe('Profile builder: moving around', () => {
  it('goes back without saving', async () => {
    setup();
    await atStep(2);
    await open();
    expect(await screen.findByTestId('builder.progress')).toHaveTextContent('Step 3 of 16');
    await fireEvent.press(screen.getByTestId('builder.back'));
    expect(await screen.findByTestId('builder.progress')).toHaveTextContent('Step 2 of 16');
    expect(puts).toHaveLength(0);
  });

  it('resumes at the step where the user stopped, with what they typed', async () => {
    setup();
    const draft = { ...draftFromMe(meWith(fullProfile) as CandidateMe), fullName: 'Typed Before' };
    await atStep(0, undefined, { draft });
    await open();
    expect(await screen.findByTestId('builder.field.fullName')).toHaveProp('value', 'Typed Before');
  });

  it('resumes at the saved step', async () => {
    setup();
    await atStep(5);
    await open();
    expect(await screen.findByText('Clinical Skills')).toBeOnTheScreen();
  });

  it('never shows the draft another account left on this phone', async () => {
    setup();
    await saveDraft('another-user', {
      step: 5,
      draft: { ...draftFromMe(meWith(fullProfile) as CandidateMe), fullName: 'Someone Else' },
      pending: [],
      uploaded: [],
    });
    await open();
    expect(await screen.findByTestId('builder.progress')).toHaveTextContent('Step 1 of 16');
    expect(screen.getByTestId('builder.field.fullName')).toHaveProp('value', 'Demo Applicant');
  });

  it('signing out removes the drafts from the phone', async () => {
    setup();
    await atStep(5);
    await open();
    await useSession.getState().signOut('user');
    expect(draftFiles()).toEqual([]);
  });

  it('shows required rules by role: a doctor cannot leave the step without a specialty', async () => {
    const me = meWith({ ...fullProfile, specialty: '' });
    setup(me);
    await atStep(1, me);
    await open();
    await next();
    expect(await screen.findByText('Primary specialty is required')).toBeOnTheScreen();
  });

  it('adds a qualification row and checks it', async () => {
    const me = meWith({ ...fullProfile, qualifications: [] });
    setup(me);
    await atStep(3, me);
    await open();
    await next();
    expect(await screen.findByText('Add at least one qualification')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('builder.qualifications.add'));
    await next();
    expect(await screen.findByText('Qualification 1: degree is required')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByTestId('builder.qualifications.0.degree'), 'MBBS');
    await fireEvent.changeText(screen.getByTestId('builder.qualifications.0.institution'), 'CMC');
    await fireEvent.changeText(screen.getByTestId('builder.qualifications.0.year'), '2012');
    await next();
    await waitFor(async () => expect((await onPhone())?.step).toBe(4));
    expect((await onPhone())?.draft.qualifications).toEqual([
      { degree: 'MBBS', institution: 'CMC', year: '2012' },
    ]);
  });

  it('removes a row', async () => {
    setup();
    await atStep(3);
    await open();
    await fireEvent.press(await screen.findByTestId('builder.qualifications.0.remove'));
    expect(screen.queryByTestId('builder.qualifications.0.degree')).toBeNull();
  });

  it('adds a chip to a list field', async () => {
    setup();
    await atStep(5);
    await open();
    await fireEvent.changeText(await screen.findByTestId('builder.field.clinicalSkills.input'), 'Echo');
    await fireEvent.press(screen.getByTestId('builder.field.clinicalSkills.add'));
    await next();
    await waitFor(async () => expect((await onPhone())?.step).toBe(6));
    expect((await onPhone())?.draft.clinicalSkills).toEqual(['PTCA', 'Echo']);
  });
});

describe('Profile builder: dates with the phone date picker', () => {
  beforeEach(() => {
    fakePicker.date = new Date(2019, 3, 9);
  });

  it('a start date is chosen in the picker and kept as YYYY-MM-DD, like the website', async () => {
    setup();
    await atStep(4);
    await open();
    const start = await screen.findByTestId('builder.experience.0.start');
    expect(start).toHaveTextContent('1 Jan 2020');
    await fireEvent.press(start);
    await fireEvent.press(screen.getByTestId('datepicker.native.pick'));
    await fireEvent.press(screen.getByTestId('builder.experience.0.start.done'));
    expect(screen.getByTestId('builder.experience.0.start')).toHaveTextContent('9 Apr 2019');
    await next();
    await waitFor(async () => expect((await onPhone())?.step).toBe(5));
    expect((await onPhone())?.draft.experience[0]?.start).toBe('2019-04-09');
  });

  it('no date is typed any more: the renewal date is a picker that can be cleared', async () => {
    setup();
    await atStep(2, undefined, {
      draft: { ...draftFromMe(meWith(fullProfile) as CandidateMe), revalidationDate: '2027-01-31' },
    });
    await open();
    const field = await screen.findByTestId('builder.field.revalidationDate');
    expect(field).toHaveTextContent('31 Jan 2027');
    expect(screen.queryByPlaceholderText('YYYY-MM-DD')).toBeNull();
    await fireEvent.press(screen.getByTestId('builder.field.revalidationDate.clear'));
    expect(screen.getByTestId('builder.field.revalidationDate')).toHaveTextContent('Select date');
  });
});

describe('Profile builder: review', () => {
  it('shows a summary and saves the whole profile once, then returns to the Profile tab and forgets the draft', async () => {
    const me = meWith({ ...fullProfile, phone: '9222222222', email: 'other@x.test' });
    setup(me);
    await atStep(15, me, { draft: { ...draftFromMe(me as CandidateMe), fullName: 'Dr. New Name' } });
    await open();
    expect(await screen.findByTestId('builder.progress')).toHaveTextContent('Step 16 of 16');
    expect(screen.getByTestId('builder.review.name')).toHaveTextContent('Dr. New Name');
    await fireEvent.press(screen.getByTestId('builder.submit'));
    await waitFor(() => expect(puts).toHaveLength(1));
    const sent = puts[0]!.profile;
    expect(sent.name).toBe('Dr. New Name');
    // B8: the sign-in phone and email, never the ones inside the old profile.
    expect(sent.phone).toBe('9876500088');
    expect(sent.email).toBe('applicant@apronhanger.test');
    expect(sent.someOtherKey).toBe('keep me');
    expect(await screen.findByTestId('profile.screen')).toBeOnTheScreen();
    expect(await onPhone()).toBeNull();
  });

  it('keeps the draft and says so when the final save fails', async () => {
    setup();
    server.use(
      http.put(`${API}/api/candidates/me`, () => HttpResponse.json({ error: 'x' }, { status: 500 })),
    );
    await atStep(15);
    await open();
    await fireEvent.press(await screen.findByTestId('builder.submit'));
    expect(await screen.findByTestId('builder.error')).toHaveTextContent('Failed to save profile');
    expect(screen.getByTestId('builder.progress')).toHaveTextContent('Step 16 of 16');
    expect(await onPhone()).not.toBeNull();
  });

  it('sends the user back to the first step that is not valid', async () => {
    const me = meWith({ ...fullProfile, clinicalSkills: [] });
    setup(me);
    await atStep(15, me);
    await open();
    await fireEvent.press(await screen.findByTestId('builder.submit'));
    expect(await screen.findByText('Add at least one clinical skill')).toBeOnTheScreen();
    expect(screen.getByTestId('builder.progress')).toHaveTextContent('Step 6 of 16');
    expect(puts).toHaveLength(0);
  });
});

describe('Profile builder: no profile yet', () => {
  it('starts empty with the account name, email and phone', async () => {
    setup(meWith(null, { cvSource: null }));
    await open();
    expect(await screen.findByTestId('builder.field.fullName')).toHaveProp('value', 'Demo Applicant');
    expect(screen.getByTestId('builder.field.email')).toHaveTextContent('applicant@apronhanger.test');
  });
});

describe('Profile builder: things the server would otherwise overwrite', () => {
  it('sends the current picture from the account, not a stale one inside the profile JSON', async () => {
    const me = meWith(
      { ...fullProfile, avatarUrl: 'https://old.example/a.jpg' },
      { avatarUrl: 'https://new.example/b.jpg', avatarCloudinaryId: 'new-id' },
    );
    setup(me);
    await atStep(15, me);
    await open();
    await fireEvent.press(await screen.findByTestId('builder.submit'));
    await waitFor(() => expect(puts).toHaveLength(1));
    expect(puts[0]!.profile.avatarUrl).toBe('https://new.example/b.jpg');
    expect(puts[0]!.profile.avatarCloudinaryId).toBe('new-id');
  });
});

describe('Profile builder: document vault', () => {
  const existing = {
    name: 'licence.pdf',
    url: 'https://res.example/licence.pdf',
    publicId: 'docs/1',
    mime: 'application/pdf',
  };
  const uploadedNew = {
    name: 'new.pdf',
    url: 'https://res.example/new.pdf',
    publicId: 'docs/2',
    mime: 'application/pdf',
  };
  const pickPdf = (name: string, size = 1000) => {
    fakeFiles.set(`file:///cache/${name}`, 'pdf-bytes');
    jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: `file:///cache/${name}`, name, size, mimeType: 'application/pdf' }],
    } as never);
  };
  let uploads: number;
  const withUpload = () => {
    uploads = 0;
    server.use(
      http.post(`${API}/api/upload/documents`, () => {
        uploads += 1;
        return HttpResponse.json([uploadedNew]);
      }),
    );
  };
  const VAULT = 14;

  it('lists the files already saved', async () => {
    setup(meWith(fullProfile, { supportingDocuments: [existing] }));
    await atStep(VAULT);
    await open();
    expect(await screen.findByTestId('builder.vault.0')).toHaveTextContent('licence.pdf');
  });

  it('a picked file waits on the phone: no upload and no save until the last step', async () => {
    setup(meWith(fullProfile, { supportingDocuments: [existing] }));
    withUpload();
    pickPdf('new.pdf');
    await atStep(VAULT);
    await open();
    await fireEvent.press(await screen.findByTestId('builder.vault.add'));
    expect(await screen.findByTestId('builder.vault.1')).toHaveTextContent('new.pdf');
    await waitFor(async () => expect((await onPhone())?.pending).toHaveLength(1));
    expect(uploads).toBe(0);
    expect(puts).toHaveLength(0);
  });

  it('the last step uploads the waiting files, then saves them with the files already there (the server replaces the whole list)', async () => {
    setup(meWith(fullProfile, { supportingDocuments: [existing] }));
    withUpload();
    pickPdf('new.pdf');
    await atStep(VAULT);
    await open();
    await fireEvent.press(await screen.findByTestId('builder.vault.add'));
    await screen.findByTestId('builder.vault.1');
    await next();
    await fireEvent.press(await screen.findByTestId('builder.submit'));
    await waitFor(() => expect(puts).toHaveLength(1));
    expect(uploads).toBe(1);
    expect(puts[0]!.supportingDocuments).toEqual([existing, uploadedNew]);
    expect(await screen.findByTestId('profile.screen')).toBeOnTheScreen();
    expect(draftFiles()).toEqual([]);
  });

  it('a retry after a failed save does not upload the files again', async () => {
    setup(meWith(fullProfile, { supportingDocuments: [existing] }));
    withUpload();
    let failPut = true;
    server.use(
      http.put(`${API}/api/candidates/me`, async ({ request }) => {
        if (failPut) return HttpResponse.json({ error: 'x' }, { status: 500 });
        const body = (await request.json()) as {
          profile: Record<string, unknown>;
          supportingDocuments?: unknown[];
        };
        puts.push(body);
        return HttpResponse.json({ ...meWith(fullProfile), profile: body.profile });
      }),
    );
    pickPdf('new.pdf');
    await atStep(VAULT);
    await open();
    await fireEvent.press(await screen.findByTestId('builder.vault.add'));
    await screen.findByTestId('builder.vault.1');
    await next();
    await fireEvent.press(await screen.findByTestId('builder.submit'));
    expect(await screen.findByTestId('builder.error')).toHaveTextContent('Failed to save profile');
    expect(uploads).toBe(1);
    // What was uploaded is remembered on the phone, so even a restart does not upload it twice.
    expect((await onPhone())?.uploaded).toEqual([uploadedNew]);
    expect((await onPhone())?.pending).toEqual([]);

    failPut = false;
    await fireEvent.press(screen.getByTestId('builder.submit'));
    await waitFor(() => expect(puts).toHaveLength(1));
    expect(uploads).toBe(1);
    expect(puts[0]!.supportingDocuments).toEqual([existing, uploadedNew]);
  });

  it('a failed upload keeps the files waiting and saves nothing', async () => {
    setup();
    server.use(
      http.post(`${API}/api/upload/documents`, () => HttpResponse.json({ error: 'x' }, { status: 500 })),
    );
    pickPdf('new.pdf');
    await atStep(VAULT);
    await open();
    await fireEvent.press(await screen.findByTestId('builder.vault.add'));
    await screen.findByTestId('builder.vault.0');
    await next();
    await fireEvent.press(await screen.findByTestId('builder.submit'));
    expect(await screen.findByTestId('builder.error')).toBeOnTheScreen();
    expect(puts).toHaveLength(0);
    expect((await onPhone())?.pending).toHaveLength(1);
  });

  it('refuses a file over 5 MB when it is picked', async () => {
    setup();
    pickPdf('big.pdf', 6 * 1024 * 1024);
    await atStep(VAULT);
    await open();
    await fireEvent.press(await screen.findByTestId('builder.vault.add'));
    expect(await screen.findByTestId('builder.vault.error')).toHaveTextContent('File must be under 5MB');
    expect(screen.queryByTestId('builder.vault.0')).toBeNull();
  });
});
