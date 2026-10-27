import { useFonts } from 'expo-font';
import * as DocumentPicker from 'expo-document-picker';
import { fireEvent, screen, waitFor, within } from 'expo-router/testing-library';
import { delay, http, HttpResponse } from 'msw';

import { applicantMe, applied, jobQuestions } from '@/test/fixtures/applications';
import { installApplicationsBackend } from '@/test/msw/applications';
import { API } from '@/test/msw/handlers';
import { installJobsBackend, makeJob } from '@/test/msw/jobs';
import { server } from '@/test/msw/server';
import { resetAppState, startSignedIn } from '@/test/startSignedIn';
import { installXhrOverFetch } from '@/test/xhrOverFetch';

jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: jest.fn() }));
jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn(() => Promise.resolve()),
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
}));

const pick = jest.mocked(DocumentPicker.getDocumentAsync);
const MB = 1024 * 1024;

const job = makeJob({
  id: 'job-2',
  role: 'Radiology Technician',
  hospital: 'Seed Valley Care Centre',
  location: 'Bengaluru, Karnataka',
});
const withQuestions = { ...job, customApplicationFields: jobQuestions } as typeof job;
const noProfile = {
  id: 'c1',
  name: 'Test Candidate',
  email: 'candidate@apronhanger.test',
  cvSource: null,
  profile: null,
};

let restoreXhr: () => void;
beforeAll(() => {
  restoreXhr = installXhrOverFetch();
});
afterAll(() => restoreXhr());
beforeEach(() => {
  resetAppState();
  jest.mocked(useFonts).mockReturnValue([true, null]);
  pick.mockReset();
});

const setup = (over: { jobs?: unknown[]; me?: unknown; apps?: unknown[] } = {}) => {
  installJobsBackend({ jobs: (over.jobs ?? [job]) as never, me: over.me ?? applicantMe });
  return installApplicationsBackend({ apps: (over.apps ?? []) as never });
};
const open = () => startSignedIn('/apply/job-2/upload', 'apply.upload.screen');
const pickPdf = (name = 'my-cv.pdf', size = 2 * MB, mimeType = 'application/pdf') =>
  pick.mockResolvedValueOnce({
    canceled: false,
    assets: [{ uri: `file:///cache/${name}`, name, size, mimeType }],
  } as never);
/** Requests that change something on the server (the screen also reads the list of applications). */
const writes = (calls: string[]) => calls.filter((c) => !c.startsWith('GET '));
const choose = async () => {
  await fireEvent.press(await screen.findByTestId('apply.upload.file.pick.files'));
};

describe('without a form CV', () => {
  it('says "Structured Form Required" with the website text, and leads back or to the form', async () => {
    setup({ me: noProfile });
    await open();
    expect(await screen.findByText('Structured Form Required')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'To maintain quality profiles for recruiters, candidates are not allowed to apply by CV upload without first completing the structured form.',
      ),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('apply.upload.locked.form'));
    expect(await screen.findByTestId('apply.form.screen')).toBeOnTheScreen();
  });

  it('Back leads to the chooser', async () => {
    setup({ me: noProfile });
    await startSignedIn('/apply/job-2', 'apply.screen');
    await fireEvent.press(await screen.findByTestId('apply.choice.form'));
    await screen.findByTestId('apply.form.screen');
    await fireEvent.press(screen.getByTestId('apply.form.back'));
    expect(await screen.findByTestId('apply.screen')).toBeOnTheScreen();
  });
});

describe('the form', () => {
  it('shows the title, the sentence, and name, email and phone filled in from the account', async () => {
    setup();
    await open();
    expect(await screen.findByText('Upload CV · Radiology Technician')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Submit a PDF or Word document — this application uses your uploaded file, not the structured form.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('apply.upload.name').props.value).toBe('Demo Applicant');
    expect(screen.getByTestId('apply.upload.email').props.value).toBe('applicant@apronhanger.test');
    expect(screen.getByTestId('apply.upload.phone').props.value).toBe('9876500088');
    expect(screen.getByText('PDF or Word (.pdf, .doc, .docx), up to 5MB')).toBeOnTheScreen();
    expect(screen.getByLabelText('Choose from files')).toBeOnTheScreen();
    expect(screen.queryByTestId('apply.upload.file.pick.camera')).not.toBeOnTheScreen();
  });

  it('every field and button has a spoken label', async () => {
    setup();
    await open();
    await screen.findByText('Upload CV · Radiology Technician');
    expect(screen.getByLabelText('Full name')).toBeOnTheScreen();
    expect(screen.getByLabelText('Email')).toBeOnTheScreen();
    expect(screen.getByLabelText('Phone')).toBeOnTheScreen();
    expect(screen.getByLabelText('Submit application')).toBeOnTheScreen();
  });
});

describe('choosing the CV', () => {
  it('shows the chosen file with its name and size, and Remove clears it', async () => {
    setup();
    await open();
    pickPdf('my-cv.pdf', 2 * MB);
    await choose();
    expect(await screen.findByText('my-cv.pdf')).toBeOnTheScreen();
    expect(screen.getByText('2.0 MB')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('apply.upload.file.remove.0'));
    expect(screen.queryByText('my-cv.pdf')).not.toBeOnTheScreen();
  });

  it('a photo is refused with the website message and is not kept', async () => {
    setup();
    await open();
    pickPdf('selfie.jpg', MB, 'image/jpeg');
    await choose();
    expect(await screen.findByTestId('apply.upload.file.error')).toHaveTextContent(
      'Please upload a PDF or Word document (.pdf, .doc, .docx)',
    );
    expect(screen.queryByText('selfie.jpg')).not.toBeOnTheScreen();
  });

  it('a file over 5 MB is refused with the website message', async () => {
    setup();
    await open();
    pickPdf('big.pdf', 5 * MB + 1);
    await choose();
    expect(await screen.findByTestId('apply.upload.file.error')).toHaveTextContent('File must be under 5MB');
  });

  it('closing the picker changes nothing and shows no error', async () => {
    setup();
    await open();
    pick.mockResolvedValueOnce({ canceled: true, assets: null } as never);
    await choose();
    expect(screen.queryByTestId('apply.upload.file.error')).not.toBeOnTheScreen();
    expect(screen.getByText('Choose your CV')).toBeOnTheScreen();
  });

  it('a picker that fails says so in plain words', async () => {
    setup();
    await open();
    pick.mockRejectedValueOnce(new Error('native boom'));
    await choose();
    expect(await screen.findByTestId('apply.upload.file.error')).toHaveTextContent(
      'Could not open your files. Please try again.',
    );
  });
});

describe('checks before anything is sent (website messages, first problem only)', () => {
  it('name, email and phone are checked, nothing is sent', async () => {
    const backend = setup();
    await open();
    await fireEvent.changeText(await screen.findByTestId('apply.upload.name'), 'A');
    await fireEvent.press(screen.getByTestId('apply.upload.submit'));
    expect(await screen.findByTestId('apply.upload.name.error')).toHaveTextContent('Name is required');
    expect(await screen.findAllByText('Name is required')).not.toHaveLength(0);

    await fireEvent.changeText(screen.getByTestId('apply.upload.name'), 'Demo Applicant');
    await fireEvent.changeText(screen.getByTestId('apply.upload.email'), 'nope');
    await fireEvent.press(screen.getByTestId('apply.upload.submit'));
    expect(await screen.findByTestId('apply.upload.email.error')).toHaveTextContent('Enter a valid email');

    await fireEvent.changeText(screen.getByTestId('apply.upload.email'), 'a@b.test');
    await fireEvent.changeText(screen.getByTestId('apply.upload.phone'), '123');
    await fireEvent.press(screen.getByTestId('apply.upload.submit'));
    expect(await screen.findByTestId('apply.upload.phone.error')).toHaveTextContent(
      'Enter a valid 10-digit phone number',
    );
    expect(writes(backend.calls)).toEqual([]);
  });

  it('no CV chosen: "Please upload your CV (PDF or Word document)"', async () => {
    const backend = setup();
    await open();
    await fireEvent.press(await screen.findByTestId('apply.upload.submit'));
    expect(await screen.findAllByText('Please upload your CV (PDF or Word document)')).not.toHaveLength(0);
    expect(writes(backend.calls)).toEqual([]);
  });
});

describe('submitting', () => {
  it('uploads the CV, applies with it, says "Application submitted with your CV!" and goes to My Applications', async () => {
    const backend = setup();
    await open();
    pickPdf();
    await choose();
    await screen.findByText('my-cv.pdf');
    await fireEvent.press(screen.getByTestId('apply.upload.submit'));
    expect(await screen.findByText('Application submitted with your CV!')).toBeOnTheScreen();
    expect(await screen.findByTestId('applications.screen')).toBeOnTheScreen();
    expect(writes(backend.calls)).toEqual(['POST /api/upload/cv', 'POST /api/applications']);
    expect(backend.bodies[0]).toMatchObject({
      jobId: 'job-2',
      cvSource: 'upload',
      cvUrl: 'https://example.org/cv/uploaded.pdf',
      uploadedCv: {
        contact: { name: 'Demo Applicant', email: 'applicant@apronhanger.test', phone: '9876500088' },
      },
    });
  });

  it('sends the email exactly as typed (no lowercasing)', async () => {
    const backend = setup();
    await open();
    await fireEvent.changeText(await screen.findByTestId('apply.upload.email'), 'Mixed.Case@Example.TEST');
    pickPdf();
    await choose();
    await screen.findByText('my-cv.pdf');
    await fireEvent.press(screen.getByTestId('apply.upload.submit'));
    await screen.findByTestId('applications.screen');
    expect(backend.bodies[0]).toMatchObject({
      uploadedCv: { contact: { email: 'Mixed.Case@Example.TEST' } },
    });
  });

  it('shows progress while it runs, and Cancel stops it without applying', async () => {
    const backend = setup();
    server.use(
      http.post(`${API}/api/upload/cv`, async () => {
        await delay(400);
        return HttpResponse.json({ url: 'u', publicId: 'p' });
      }),
    );
    await open();
    pickPdf();
    await choose();
    await screen.findByText('my-cv.pdf');
    await fireEvent.press(screen.getByTestId('apply.upload.submit'));
    expect(await screen.findByTestId('apply.upload.file.progress')).toBeOnTheScreen();
    expect(screen.getByLabelText('Upload progress')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('apply.upload.file.cancel'));
    await waitFor(() => expect(screen.queryByTestId('apply.upload.file.progress')).not.toBeOnTheScreen());
    expect(screen.getByText('my-cv.pdf')).toBeOnTheScreen();
    expect(backend.calls).not.toContain('POST /api/applications');
    expect(screen.getByTestId('apply.upload.screen')).toBeOnTheScreen();
  });

  it('a failed upload shows the reason with Try again, and Try again sends it again', async () => {
    setup();
    let calls = 0;
    server.use(
      http.post(`${API}/api/upload/cv`, () =>
        ++calls === 1
          ? HttpResponse.json({ error: 'Invalid file type.' }, { status: 400 })
          : HttpResponse.json({
              url: 'https://example.org/cv/x.pdf',
              publicId: 'p',
              name: 'my-cv.pdf',
              mime: 'application/pdf',
            }),
      ),
    );
    await open();
    pickPdf();
    await choose();
    await screen.findByText('my-cv.pdf');
    await fireEvent.press(screen.getByTestId('apply.upload.submit'));
    expect(await screen.findByTestId('apply.upload.file.upload.error')).toHaveTextContent(
      'Invalid file type.',
    );
    expect(screen.getByText('my-cv.pdf')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('apply.upload.file.retry'));
    expect(await screen.findByTestId('applications.screen')).toBeOnTheScreen();
    expect(calls).toBe(2);
  });

  it('when the CV went up but the application is refused, Try again does not upload the file a second time', async () => {
    const backend = setup();
    let applies = 0;
    server.use(
      http.post(`${API}/api/applications`, async ({ request }) => {
        backend.bodies.push(await request.json());
        return ++applies === 1
          ? HttpResponse.json({ error: 'This job is no longer accepting applications' }, { status: 400 })
          : HttpResponse.json({ ...applied, jobId: 'job-2' }, { status: 201 });
      }),
    );
    await open();
    pickPdf();
    await choose();
    await screen.findByText('my-cv.pdf');
    await fireEvent.press(screen.getByTestId('apply.upload.submit'));
    expect(await screen.findByTestId('apply.upload.file.upload.error')).toHaveTextContent(
      'This job is no longer accepting applications',
    );
    await fireEvent.press(screen.getByTestId('apply.upload.file.retry'));
    expect(await screen.findByTestId('applications.screen')).toBeOnTheScreen();
    expect(backend.calls.filter((c) => c === 'POST /api/upload/cv')).toHaveLength(1);
  });

  it('inputs and buttons are locked while it runs', async () => {
    setup();
    server.use(
      http.post(`${API}/api/upload/cv`, async () => {
        await delay(400);
        return HttpResponse.json({ url: 'u', publicId: 'p' });
      }),
    );
    await open();
    pickPdf();
    await choose();
    await screen.findByText('my-cv.pdf');
    await fireEvent.press(screen.getByTestId('apply.upload.submit'));
    await screen.findByTestId('apply.upload.file.progress');
    expect(screen.getByTestId('apply.upload.name').props.editable).toBe(false);
    expect(screen.getByTestId('apply.upload.submit')).toBeDisabled();
  });
});

describe('job questions on this screen', () => {
  it('are shown and required ones are enforced with the website message', async () => {
    const backend = setup({ jobs: [withQuestions] });
    await open();
    expect(await screen.findByText('Additional questions from the recruiter')).toBeOnTheScreen();
    pickPdf();
    await choose();
    await screen.findByText('my-cv.pdf');
    await fireEvent.press(screen.getByTestId('apply.upload.submit'));
    expect(
      await screen.findAllByText('"Which imaging machines have you operated?" is required'),
    ).not.toHaveLength(0);
    expect(writes(backend.calls)).toEqual([]);
  });

  it('are sent with the application', async () => {
    const backend = setup({ jobs: [withQuestions] });
    await open();
    await fireEvent.changeText(await screen.findByTestId('apply.upload.questions.q_modality'), 'CT');
    await fireEvent.changeText(screen.getByTestId('apply.upload.questions.q_scans'), '8');
    await fireEvent.press(screen.getByTestId('apply.upload.questions.q_shift.option.0'));
    await fireEvent.press(screen.getByTestId('apply.upload.questions.q_license.yes'));
    pickPdf();
    await choose();
    await screen.findByText('my-cv.pdf');
    await fireEvent.press(screen.getByTestId('apply.upload.submit'));
    await screen.findByTestId('applications.screen');
    expect(backend.bodies[0]).toMatchObject({
      customFieldResponses: { q_modality: 'CT', q_scans: 8, q_shift: 'Morning', q_license: true },
    });
  });
});

describe('already applied', () => {
  it('shows the Already applied page with the short website sentence', async () => {
    setup({ apps: [{ ...applied, jobId: 'job-2' }] });
    await open();
    expect(await screen.findByText('Already applied')).toBeOnTheScreen();
    expect(
      within(screen.getByTestId('apply.upload.applied')).getByText(/Radiology Technician/),
    ).toBeOnTheScreen();
  });
});
