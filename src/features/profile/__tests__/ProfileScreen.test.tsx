import { useFonts } from 'expo-font';
import * as WebBrowser from 'expo-web-browser';
import { fireEvent, screen } from 'expo-router/testing-library';
import { http, HttpResponse } from 'msw';

import { applicantMe } from '@/test/fixtures/applications';
import { API } from '@/test/msw/handlers';
import { installJobsBackend } from '@/test/msw/jobs';
import { server } from '@/test/msw/server';
import { resetAppState, startSignedIn } from '@/test/startSignedIn';

jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: jest.fn() }));
jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn(() => Promise.resolve()),
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(() => Promise.resolve({ type: 'cancel' })),
}));

beforeEach(() => {
  resetAppState();
  jest.mocked(useFonts).mockReturnValue([true, null]);
  jest.mocked(WebBrowser.openBrowserAsync).mockClear();
});

describe('Profile tab', () => {
  it('shows the candidate name, email and profile completeness', async () => {
    installJobsBackend({ me: applicantMe });
    await startSignedIn('/profile', 'profile.screen');
    expect(await screen.findByTestId('profile.name')).toHaveTextContent('Demo Applicant');
    expect(screen.getByTestId('profile.email')).toHaveTextContent('applicant@apronhanger.test');
    expect(screen.getByTestId('profile.completeness')).toHaveTextContent(/94%/);
  });

  it('shows Try Again when the profile cannot be loaded and still lets the user sign out', async () => {
    installJobsBackend({ me: applicantMe });
    server.use(
      http.get(`${API}/api/candidates/me`, () => HttpResponse.json({ error: 'x' }, { status: 500 })),
    );
    await startSignedIn('/profile', 'profile.screen');
    expect(await screen.findByTestId('profile.error')).toBeOnTheScreen();
    expect(screen.getByTestId('profile.signout')).toBeOnTheScreen();
  });
});

describe('Settings', () => {
  it('shows the app version and opens the privacy policy in the in-app browser', async () => {
    installJobsBackend({ me: applicantMe });
    await startSignedIn('/settings', 'settings.screen');
    expect(screen.getByTestId('settings.version')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('settings.privacy'));
    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(
      expect.stringMatching(/^https:\/\/apronhanger\.work\//),
    );
  });

  it('signs out', async () => {
    installJobsBackend({ me: applicantMe });
    await startSignedIn('/settings', 'settings.screen');
    await fireEvent.press(screen.getByTestId('settings.signout'));
    expect(await screen.findByTestId('login.screen')).toBeOnTheScreen();
  });
});

describe('Profile tab navigation', () => {
  it('opens Settings', async () => {
    installJobsBackend({ me: applicantMe });
    await startSignedIn('/profile', 'profile.screen');
    await fireEvent.press(await screen.findByTestId('profile.settings'));
    expect(await screen.findByTestId('settings.screen')).toBeOnTheScreen();
  });
});
