import { onlineManager } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import * as Network from 'expo-network';
import * as WebBrowser from 'expo-web-browser';
import { act, fireEvent, screen, waitFor, within } from 'expo-router/testing-library';
import { delay, http, HttpResponse } from 'msw';

import {
  applied,
  documentsRequested,
  documentsUploaded,
  interviewVirtual,
  offerSent,
  rejected,
} from '@/test/fixtures/applications';
import { installApplicationsBackend } from '@/test/msw/applications';
import { API } from '@/test/msw/handlers';
import { installJobsBackend, makeJob } from '@/test/msw/jobs';
import { server } from '@/test/msw/server';
import { resetAppState, startSignedIn } from '@/test/startSignedIn';

jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: jest.fn() }));
jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn(() => Promise.resolve()),
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn() }));

beforeEach(() => {
  resetAppState();
  jest.mocked(useFonts).mockReturnValue([true, null]);
  jest.mocked(WebBrowser.openBrowserAsync).mockResolvedValue({ type: 'dismiss' } as never);
});
afterEach(() => {
  jest
    .mocked(Network.getNetworkStateAsync)
    .mockResolvedValue({ isConnected: true, isInternetReachable: true } as never);
  onlineManager.setOnline(true);
});

const jobOf = (row: { jobId?: unknown }) => makeJob({ id: String(row.jobId), role: 'Emergency Physician' });
const setup = (apps: unknown[]) => {
  installJobsBackend({ jobs: [] });
  return installApplicationsBackend({ apps: apps as never });
};
const open = (id: string) => startSignedIn(`/application/${id}`, 'application.screen');

describe('Application details: content', () => {
  it('shows the role, hospital and place, applied date, status, steps and last update', async () => {
    setup([applied]);
    await open(applied.id);
    expect(await screen.findByRole('header', { name: 'ICU Nurse' })).toBeOnTheScreen();
    expect(screen.getByText('Seed City Multispeciality Hospital · Kolkata')).toBeOnTheScreen();
    expect(screen.getByText('Applied 25 Oct 2026')).toBeOnTheScreen();
    expect(screen.getByLabelText('Status: Applied')).toBeOnTheScreen();
    expect(screen.getByLabelText('Progress: step 1 of 5, Applied')).toBeOnTheScreen();
    expect(screen.getByText('Application received by hospital')).toBeOnTheScreen();
  });

  it("View job opens the job page (the website's role link)", async () => {
    setup([applied]);
    installJobsBackend({ jobs: [jobOf(applied)] });
    await open(applied.id);
    await fireEvent.press(await screen.findByTestId('application.viewjob'));
    expect(await screen.findByTestId('job.screen')).toBeOnTheScreen();
  });

  it('Back returns to My Applications', async () => {
    setup([applied]);
    await startSignedIn('/applications', 'applications.screen');
    await fireEvent.press(await screen.findByTestId(`application.row.${applied.id}`));
    await screen.findByTestId('application.screen');
    await fireEvent.press(screen.getByTestId('application.back'));
    expect(await screen.findByTestId('applications.screen')).toBeOnTheScreen();
  });

  it('a rejected application shows the closed sentence and the note from the hospital', async () => {
    setup([rejected]);
    await open(rejected.id);
    expect(await screen.findByText('Application closed by recruiter')).toBeOnTheScreen();
    expect(screen.getByText('The position has been filled.')).toBeOnTheScreen();
  });

  it('uploaded documents are listed, each with a way to open it', async () => {
    setup([documentsUploaded]);
    await open(documentsUploaded.id);
    const card = within(await screen.findByTestId('action.card'));
    expect(card.getByText('Documents Submitted')).toBeOnTheScreen();
    await fireEvent.press(card.getByTestId('action.submitted.open.0'));
    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith('https://example.org/docs/degree-seed.pdf');
  });
});

describe('Application details: answering', () => {
  it('shows the card for the status and, after Accept, the new status without leaving', async () => {
    setup([interviewVirtual]);
    await open(interviewVirtual.id);
    await fireEvent.press(await screen.findByTestId('action.interview.accept'));
    expect(await screen.findByText('Response recorded successfully!')).toBeOnTheScreen();
    expect(await screen.findByLabelText('Status: Interview Accepted')).toBeOnTheScreen();
    await waitFor(() => expect(screen.queryByTestId('action.card')).not.toBeOnTheScreen());
  });

  it('an offer: Accept Offer changes the status to Offer Accepted', async () => {
    setup([offerSent]);
    await open(offerSent.id);
    await fireEvent.press(await screen.findByTestId('action.offer.accept'));
    expect(await screen.findByLabelText('Status: Offer Accepted')).toBeOnTheScreen();
  });

  it('the hospital changed it meanwhile: the refusal is shown and the screen shows the true status', async () => {
    const backend = setup([interviewVirtual]);
    await open(interviewVirtual.id);
    await screen.findByTestId('action.interview.accept');
    backend.apps[0]!.status = 'InterviewDeclined';
    await fireEvent.press(screen.getByTestId('action.interview.accept'));
    expect(await screen.findByText(/^Failed to update status:/)).toBeOnTheScreen();
    expect(await screen.findByLabelText('Status: Interview Declined')).toBeOnTheScreen();
  });

  it('upload the requested documents from here', async () => {
    setup([documentsRequested]);
    await open(documentsRequested.id);
    expect(await screen.findByText('Document Request')).toBeOnTheScreen();
    expect(screen.getByTestId('action.docs.files.pick.files')).toBeOnTheScreen();
  });
});

describe('Application details: loading, not found, error, offline', () => {
  it('shows a placeholder while the list loads', async () => {
    setup([applied]);
    server.use(
      http.get(`${API}/api/applications`, async () => {
        await delay(300);
        return HttpResponse.json([applied]);
      }),
    );
    await open(applied.id);
    expect(await screen.findByTestId('application.loading')).toBeOnTheScreen();
    expect(await screen.findByRole('header', { name: 'ICU Nurse' })).toBeOnTheScreen();
  });

  it('an application that is not in the list says so and leads back', async () => {
    setup([applied]);
    await open('does-not-exist');
    expect(await screen.findByText('Application not found')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('application.notfound.back'));
    expect(await screen.findByTestId('applications.screen')).toBeOnTheScreen();
  });

  it('a failed load shows Try Again, and Try Again loads it', async () => {
    setup([applied]);
    let calls = 0;
    server.use(
      http.get(`${API}/api/applications`, () =>
        ++calls === 1 ? HttpResponse.json({ error: 'boom' }, { status: 500 }) : HttpResponse.json([applied]),
      ),
    );
    await open(applied.id);
    expect(await screen.findByTestId('application.error')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Try Again'));
    expect(await screen.findByRole('header', { name: 'ICU Nurse' })).toBeOnTheScreen();
  });

  it('offline: a clear message', async () => {
    jest
      .mocked(Network.getNetworkStateAsync)
      .mockResolvedValue({ isConnected: false, isInternetReachable: false } as never);
    setup([applied]);
    await open(applied.id);
    await act(async () => onlineManager.setOnline(false));
    expect(await screen.findByTestId('application.offline')).toBeOnTheScreen();
  });
});
