import { useFonts } from 'expo-font';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import { Alert } from 'react-native';
import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { http, HttpResponse } from 'msw';

import { applicantMe } from '@/test/fixtures/applications';
import { API } from '@/test/msw/handlers';
import { installJobsBackend } from '@/test/msw/jobs';
import { server } from '@/test/msw/server';
import { installXhrOverFetch } from '@/test/xhrOverFetch';
import { resetAppState, startSignedIn } from '@/test/startSignedIn';

jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: jest.fn() }));
jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn(() => Promise.resolve()),
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
}));
jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(() => Promise.resolve({ type: 'cancel' })),
}));

let restoreXhr: () => void;
beforeAll(() => {
  restoreXhr = installXhrOverFetch();
});
afterAll(() => restoreXhr());
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
  it('opens the profile builder', async () => {
    installJobsBackend({ me: applicantMe });
    await startSignedIn('/profile', 'profile.screen');
    await fireEvent.press(await screen.findByTestId('profile.edit'));
    expect(await screen.findByTestId('builder.screen')).toBeOnTheScreen();
  });

  it('opens Settings', async () => {
    installJobsBackend({ me: applicantMe });
    await startSignedIn('/profile', 'profile.screen');
    await fireEvent.press(await screen.findByTestId('profile.settings'));
    expect(await screen.findByTestId('settings.screen')).toBeOnTheScreen();
  });
});

describe('Profile photo', () => {
  const photo = (name = 'me.jpg', fileSize = 1000) =>
    ({
      canceled: false,
      assets: [{ uri: `file:///cache/${name}`, fileName: name, fileSize, mimeType: 'image/jpeg' }],
    }) as never;
  const setup = (me = applicantMe) => {
    const calls: string[] = [];
    installJobsBackend({ me });
    server.use(
      http.post(`${API}/api/upload/avatar`, () => {
        calls.push('POST avatar');
        return HttpResponse.json({ url: 'https://res.example.test/a.jpg', publicId: 'avatars/a' });
      }),
      http.delete(`${API}/api/upload/avatar`, () => {
        calls.push('DELETE avatar');
        return HttpResponse.json({ success: true });
      }),
    );
    return calls;
  };

  it('uploads a picture chosen from the gallery', async () => {
    const calls = setup();
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValueOnce(photo());
    await startSignedIn('/profile', 'profile.screen');
    await fireEvent.press(await screen.findByTestId('profile.photo.gallery'));
    await waitFor(() => expect(calls).toEqual(['POST avatar']));
  });

  it('refuses a picture over 5 MB without uploading it', async () => {
    const calls = setup();
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValueOnce(photo('big.jpg', 6 * 1024 * 1024));
    await startSignedIn('/profile', 'profile.screen');
    await fireEvent.press(await screen.findByTestId('profile.photo.gallery'));
    expect(await screen.findByText('Profile picture must be less than 5MB.')).toBeOnTheScreen();
    expect(calls).toEqual([]);
  });

  it('removes the picture after a confirm, only when there is one', async () => {
    const calls = setup({ ...applicantMe, avatarUrl: 'https://res.example.test/a.jpg' } as never);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      buttons?.find((b) => b.text === 'Remove')?.onPress?.();
    });
    await startSignedIn('/profile', 'profile.screen');
    await fireEvent.press(await screen.findByTestId('profile.photo.remove'));
    await waitFor(() => expect(calls).toEqual(['DELETE avatar']));
    alert.mockRestore();
  });

  it('has no Remove button without a picture', async () => {
    setup();
    await startSignedIn('/profile', 'profile.screen');
    await screen.findByTestId('profile.photo.gallery');
    expect(screen.queryByTestId('profile.photo.remove')).toBeNull();
  });
});
