import { useFonts } from 'expo-font';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { fireEvent, screen, waitFor } from 'expo-router/testing-library';

import { applicantMe } from '@/test/fixtures/applications';
import { installJobsBackend } from '@/test/msw/jobs';
import { resetAppState, startSignedIn } from '@/test/startSignedIn';

jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: jest.fn() }));
jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn(() => Promise.resolve()),
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock('expo-print', () => ({
  printToFileAsync: jest.fn(() => Promise.resolve({ uri: 'file:///cache/p.pdf', numberOfPages: 1 })),
}));
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  shareAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(() => Promise.resolve({ type: 'cancel' })),
}));
jest.mock('expo-file-system', () => ({
  File: class {
    uri: string;
    constructor(...p: (string | { uri: string })[]) {
      this.uri = p.map((x) => (typeof x === 'string' ? x : x.uri)).join('/');
    }
    move() {}
    delete() {}
  },
  Paths: { cache: { uri: 'file:///cache' } },
  Directory: class {},
}));

const full = {
  ...applicantMe,
  profile: {
    ...applicantMe.profile,
    experience: [
      { role: 'Consultant', hospital: 'AMRI', city: 'Kolkata', start: '2021-08-01', end: '', current: true },
    ],
    qualifications: [{ degree: 'MBBS', institution: 'CMC', year: '2012' }],
    clinicalSkills: ['PTCA'],
  },
};
const cvOnly = {
  ...applicantMe,
  profile: null,
  cvSource: 'upload',
  uploadedCvName: 'my-cv.pdf',
  cvUrl: 'https://res.example/my-cv.pdf',
};
const nothing = { ...applicantMe, profile: null, cvSource: null };

beforeEach(() => {
  resetAppState();
  jest.mocked(useFonts).mockReturnValue([true, null]);
  jest.mocked(Sharing.shareAsync).mockClear();
  jest.mocked(WebBrowser.openBrowserAsync).mockClear();
});
const open = () => startSignedIn('/cv-preview', 'cv.screen');

describe('CV preview', () => {
  it('shows the generated CV: name, experience, education', async () => {
    installJobsBackend({ me: full });
    await open();
    expect(await screen.findByTestId('cv.name')).toHaveTextContent('Demo Applicant');
    expect(screen.getByText('Clinical Experience')).toBeOnTheScreen();
    expect(screen.getByText('Consultant')).toBeOnTheScreen();
    expect(screen.getByText('Education')).toBeOnTheScreen();
  });

  it('downloads the CV as a PDF through the share sheet', async () => {
    installJobsBackend({ me: full });
    await open();
    await fireEvent.press(await screen.findByTestId('cv.pdf'));
    await waitFor(() => expect(Sharing.shareAsync).toHaveBeenCalled());
  });

  it('says so when the PDF cannot be made', async () => {
    installJobsBackend({ me: full });
    jest.mocked(Sharing.isAvailableAsync).mockResolvedValueOnce(false);
    await open();
    await fireEvent.press(await screen.findByTestId('cv.pdf'));
    expect(await screen.findByTestId('cv.error')).toBeOnTheScreen();
  });

  it('has Edit CV, which opens the profile form', async () => {
    installJobsBackend({ me: full });
    await open();
    await fireEvent.press(await screen.findByTestId('cv.edit'));
    expect(await screen.findByTestId('builder.screen')).toBeOnTheScreen();
  });

  it('says "No CV yet" with the way to build one', async () => {
    installJobsBackend({ me: nothing });
    await open();
    expect(await screen.findByText('No CV yet')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('cv.build'));
    expect(await screen.findByTestId('builder.screen')).toBeOnTheScreen();
  });

  it('for an uploaded CV only: names the file and opens it', async () => {
    installJobsBackend({ me: cvOnly });
    await open();
    expect(await screen.findByText("You've uploaded a CV")).toBeOnTheScreen();
    expect(screen.getByText(/my-cv\.pdf/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('cv.document'));
    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith('https://res.example/my-cv.pdf');
  });

  it('is reached from the Profile tab', async () => {
    installJobsBackend({ me: full });
    await startSignedIn('/profile', 'profile.screen');
    await fireEvent.press(await screen.findByTestId('profile.cv'));
    expect(await screen.findByTestId('cv.screen')).toBeOnTheScreen();
  });
});
