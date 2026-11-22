import { useFonts } from 'expo-font';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import { Alert, StyleSheet } from 'react-native';
import { fireEvent, screen, waitFor, within } from 'expo-router/testing-library';
import { http, HttpResponse } from 'msw';

import { applicantMe } from '@/test/fixtures/applications';
import { API } from '@/test/msw/handlers';
import { installJobsBackend } from '@/test/msw/jobs';
import { server } from '@/test/msw/server';
import { installXhrOverFetch } from '@/test/xhrOverFetch';
import { resetAppState, startSignedIn } from '@/test/startSignedIn';
import { colors, radius, shadows } from '@/theme/tokens';

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
/**
 * The Profile tab: start the app and wait until the `me` query has landed. The grouped rows (profile.edit,
 * profile.settings ...) are already on screen while it loads, so a find* on them alone races the query.
 */
async function openProfile() {
  await startSignedIn('/profile', 'profile.screen');
  await screen.findByTestId('profile.strength');
}

beforeEach(() => {
  resetAppState();
  jest.mocked(useFonts).mockReturnValue([true, null]);
  jest.mocked(WebBrowser.openBrowserAsync).mockClear();
});

describe('Profile tab', () => {
  it('shows the candidate name, email and profile completeness', async () => {
    installJobsBackend({ me: applicantMe });
    await openProfile();
    expect(await screen.findByTestId('profile.name')).toHaveTextContent('Demo Applicant');
    expect(screen.getByTestId('profile.email')).toHaveTextContent('applicant@apronhanger.test');
    expect(screen.getByTestId('profile.completeness')).toHaveTextContent(/94%/);
    // D32: the number sits inside a ring; screen readers still hear the full website sentence.
    expect(screen.getByTestId('profile.completeness')).toHaveProp(
      'accessibilityLabel',
      'Profile completeness: 94%',
    );
  });

  it('D32 R2 (issue 13): the strength card is the app card: white, radius 12, soft shadow, no hairline border', async () => {
    installJobsBackend({ me: applicantMe });
    await openProfile();
    const style = StyleSheet.flatten(screen.getByTestId('profile.strength').props.style);
    expect(style).toMatchObject({
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      boxShadow: shadows.soft,
    });
    expect(style.borderWidth ?? 0).toBe(0);
  });

  it('D32: lists up to three next best fixes under the ring, each opening the builder', async () => {
    installJobsBackend({ me: applicantMe });
    await openProfile();
    expect(await screen.findByTestId('profile.fixes')).toBeOnTheScreen();
    expect(screen.getByTestId('profile.fixes.0')).toHaveTextContent('Add your registration number');
    expect(screen.getByTestId('profile.fixes.2')).toBeOnTheScreen();
    expect(screen.queryByTestId('profile.fixes.3')).toBeNull();
    await fireEvent.press(screen.getByTestId('profile.fixes.0'));
    expect(await screen.findByTestId('builder.screen')).toBeOnTheScreen();
  });

  it('D32: Edit profile, My CV, Settings and Sign out are grouped rows once the profile exists', async () => {
    installJobsBackend({ me: applicantMe });
    await openProfile();
    expect(await screen.findByTestId('profile.group.profile')).toBeOnTheScreen();
    expect(screen.getByTestId('profile.edit')).toHaveTextContent('Edit profile');
    expect(screen.getByTestId('profile.cv')).toHaveTextContent('My CV');
    expect(screen.getByTestId('profile.group.account')).toBeOnTheScreen();
    expect(screen.getByTestId('profile.settings')).toHaveTextContent('Settings');
    expect(screen.getByTestId('profile.signout')).toHaveTextContent('Sign out');
  });

  it('D32: with no profile yet the hero holds one filled "Build my profile" button and no fixes list', async () => {
    installJobsBackend({ me: { ...applicantMe, profile: null } });
    await openProfile();
    expect(await screen.findByTestId('profile.edit')).toHaveTextContent('Build my profile');
    expect(screen.getByTestId('profile.completeness')).toHaveTextContent(/0%/);
    expect(screen.queryByTestId('profile.fixes')).toBeNull();
    await fireEvent.press(screen.getByTestId('profile.edit'));
    expect(await screen.findByTestId('builder.screen')).toBeOnTheScreen();
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

  it('D32: About and Account are grouped lists; Delete account is the last, red-text row', async () => {
    installJobsBackend({ me: applicantMe });
    await startSignedIn('/settings', 'settings.screen');
    expect(screen.getByTestId('settings.group.about')).toBeOnTheScreen();
    expect(screen.getByTestId('settings.terms')).toHaveTextContent('Terms and Conditions');
    await fireEvent.press(screen.getByTestId('settings.terms'));
    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(expect.stringMatching(/terms/i));
    // D32 R2 (issue 19): Delete account is the last row of the Account group instead of a group of its own.
    expect(screen.queryByTestId('settings.group.danger')).toBeNull();
    const account = within(screen.getByTestId('settings.group.account'));
    expect(account.getByTestId('settings.signout')).toBeOnTheScreen();
    expect(account.getByTestId('settings.delete')).toBeOnTheScreen();
    expect(account.getByTestId('settings.group.account.footer')).toHaveTextContent(
      'Deletes your profile, CV, photo, documents and saved jobs. Your applications stay with the hospitals.',
    );
    expect(screen.getByTestId('settings.delete.title')).toHaveStyle({ color: colors.errorText });
    await fireEvent.press(screen.getByTestId('settings.delete'));
    expect(await screen.findByTestId('delete.screen')).toBeOnTheScreen();
  });

  it('D32 R2 (issue 19): every leading icon is brand blue, the destructive row carries a red trash icon', async () => {
    installJobsBackend({ me: applicantMe });
    await startSignedIn('/settings', 'settings.screen');
    for (const id of ['settings.privacy', 'settings.terms', 'settings.signout']) {
      expect(screen.getByTestId(`${id}.icon`)).toHaveProp('tintColor', colors.brand);
    }
    expect(screen.getByTestId('settings.delete.icon')).toHaveProp('tintColor', colors.errorText);
  });
});

describe('Profile tab navigation', () => {
  it('opens the profile builder', async () => {
    installJobsBackend({ me: applicantMe });
    await openProfile();
    await fireEvent.press(await screen.findByTestId('profile.edit'));
    expect(await screen.findByTestId('builder.screen')).toBeOnTheScreen();
  });

  it('opens Settings', async () => {
    installJobsBackend({ me: applicantMe });
    await openProfile();
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

  // D32 R2 (issue 12): one photo control. The avatar and its camera badge open a sheet with the options; the old
  // "Take photo" / "Choose from gallery" / "Remove photo" buttons under the avatar are gone, their testIDs live on.
  const openSheet = async (via = 'profile.photo.change') => {
    await fireEvent.press(await screen.findByTestId(via));
    return screen.findByTestId('profile.photo.sheet');
  };

  it('R3 a11y P3-10: screen readers get one photo control (the avatar); the sheet closes on the escape gesture', async () => {
    setup();
    await openProfile();
    const badge = await screen.findByTestId('profile.photo.change');
    expect(badge.props.accessible).toBe(false);
    expect(screen.getByTestId('profile.photo.open').props.accessibilityState).toMatchObject({ busy: false });
    const sheet = await openSheet('profile.photo.open');
    expect(typeof sheet.props.onAccessibilityEscape).toBe('function');
  });

  it('D32: the photo options live in a sheet, not under the avatar', async () => {
    setup();
    await openProfile();
    expect(screen.queryByTestId('profile.photo.sheet')).toBeNull();
    expect(screen.queryByTestId('profile.photo.gallery')).toBeNull();
    expect(screen.queryByTestId('profile.photo.camera')).toBeNull();
    await openSheet();
    expect(screen.getByTestId('profile.photo.camera')).toHaveTextContent('Take photo');
    expect(screen.getByTestId('profile.photo.gallery')).toHaveTextContent('Choose from gallery');
    expect(screen.getByTestId('profile.photo.cancel')).toHaveTextContent('Cancel');
  });

  it('D32: tapping the avatar itself opens the same sheet', async () => {
    setup();
    await openProfile();
    await openSheet('profile.photo.open');
    expect(screen.getByTestId('profile.photo.gallery')).toBeOnTheScreen();
  });

  it('Cancel closes the sheet and changes nothing', async () => {
    const calls = setup();
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockClear();
    await openProfile();
    await openSheet();
    await fireEvent.press(screen.getByTestId('profile.photo.cancel'));
    await waitFor(() => expect(screen.queryByTestId('profile.photo.sheet')).toBeNull());
    expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
    expect(calls).toEqual([]);
  });

  it('uploads a picture chosen from the gallery', async () => {
    const calls = setup();
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValueOnce(photo());
    await openProfile();
    await openSheet();
    await fireEvent.press(screen.getByTestId('profile.photo.gallery'));
    await waitFor(() => expect(calls).toEqual(['POST avatar']));
    expect(screen.queryByTestId('profile.photo.sheet')).toBeNull();
  });

  it('takes a photo with the camera', async () => {
    const calls = setup();
    jest.mocked(ImagePicker.requestCameraPermissionsAsync).mockResolvedValueOnce({
      granted: true,
      canAskAgain: true,
    } as never);
    jest.mocked(ImagePicker.launchCameraAsync).mockResolvedValueOnce(photo('cam.jpg'));
    await openProfile();
    await openSheet();
    await fireEvent.press(screen.getByTestId('profile.photo.camera'));
    await waitFor(() => expect(calls).toEqual(['POST avatar']));
  });

  it('refuses a picture over 5 MB without uploading it', async () => {
    const calls = setup();
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValueOnce(photo('big.jpg', 6 * 1024 * 1024));
    await openProfile();
    await openSheet();
    await fireEvent.press(screen.getByTestId('profile.photo.gallery'));
    expect(await screen.findByText('Profile picture must be less than 5MB.')).toBeOnTheScreen();
    expect(calls).toEqual([]);
  });

  it('removes the picture after a confirm, only when there is one', async () => {
    const calls = setup({ ...applicantMe, avatarUrl: 'https://res.example.test/a.jpg' } as never);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      buttons?.find((b) => b.text === 'Remove')?.onPress?.();
    });
    await openProfile();
    await openSheet();
    expect(screen.getByTestId('profile.photo.remove')).toHaveTextContent('Remove photo');
    await fireEvent.press(screen.getByTestId('profile.photo.remove'));
    await waitFor(() => expect(calls).toEqual(['DELETE avatar']));
    alert.mockRestore();
  });

  it('has no Remove option without a picture', async () => {
    setup();
    await openProfile();
    await openSheet();
    expect(screen.getByTestId('profile.photo.gallery')).toBeOnTheScreen();
    expect(screen.queryByTestId('profile.photo.remove')).toBeNull();
  });
});
