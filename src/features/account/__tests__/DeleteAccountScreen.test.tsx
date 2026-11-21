import { useFonts } from 'expo-font';
import { router } from 'expo-router';
import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { http, HttpResponse } from 'msw';
import { Alert, StyleSheet } from 'react-native';

import { secureStorage } from '@/lib/secureStorage';
import { applicantMe } from '@/test/fixtures/applications';
import { API } from '@/test/msw/handlers';
import { installJobsBackend } from '@/test/msw/jobs';
import { server } from '@/test/msw/server';
import { resetAppState, startSignedIn } from '@/test/startSignedIn';
import { REFRESH_KEY, TOKEN_KEY } from '@/features/auth/sessionStore';
import { colors, fonts } from '@/theme/tokens';

jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: jest.fn() }));
jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn(() => Promise.resolve()),
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
}));

let requests: { password?: unknown }[];
let others: string[];
beforeEach(() => {
  resetAppState();
  jest.mocked(useFonts).mockReturnValue([true, null]);
  requests = [];
  others = [];
  installJobsBackend({ me: applicantMe });
  server.use(
    http.post(`${API}/api/account/delete`, async ({ request }) => {
      requests.push((await request.json()) as { password?: unknown });
      return HttpResponse.json({ success: true });
    }),
    // Anything else the deleted account tried to say to the server would show up here.
    http.post(`${API}/api/auth/logout`, () => {
      others.push('logout');
      return HttpResponse.json({ success: true });
    }),
    http.delete(`${API}/api/push-tokens`, () => {
      others.push('push');
      return HttpResponse.json({ success: true });
    }),
  );
});
const confirmWith = (button: 'Delete' | 'Cancel') =>
  jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
    buttons?.find((b) => b.text === button)?.onPress?.();
  });
const open = () => startSignedIn('/delete-account', 'delete.screen');
const typePassword = async (value = 'Passw0rd!') =>
  fireEvent.changeText(await screen.findByTestId('delete.password'), value);

describe('Delete account', () => {
  it('says what will happen', async () => {
    await open();
    expect(screen.getByTestId('delete.warning')).toHaveTextContent(/cannot be undone/);
    expect(screen.getByTestId('delete.warning')).toHaveTextContent(/applications/);
    // What the hospitals keep (docs/store/ACCOUNT-DELETION-DATA.md section 3): Apple asks apps to say what is retained.
    const warning = screen.getByTestId('delete.warning');
    expect(warning).toHaveTextContent(/hospital's own notes/);
    expect(warning).toHaveTextContent(/interview history/);
    expect(warning).toHaveTextContent(/offer letter/);
  });

  it('D32: an error-tone warning panel with an icon, then what is removed and what is kept as icon rows', async () => {
    await open();
    expect(StyleSheet.flatten(screen.getByTestId('delete.warning.panel').props.style)).toMatchObject({
      backgroundColor: colors.destructiveSoft,
    });
    expect(screen.getByTestId('delete.warning.panel.icon')).toBeOnTheScreen();
    expect(screen.getByTestId('delete.removed')).toHaveTextContent(/CV/);
    expect(screen.getByTestId('delete.kept')).toHaveTextContent(/interview history/);
    expect(screen.getByTestId('delete.removed.0.icon')).toBeOnTheScreen();
    expect(screen.getByTestId('delete.kept.0.icon')).toBeOnTheScreen();
    expect(StyleSheet.flatten(screen.getByTestId('delete.submit').props.style)).toMatchObject({
      backgroundColor: colors.destructive,
      alignSelf: 'stretch',
    });
  });

  it('D32 R2 (issue 20): light 16-pt muted icons, 14/600 section headers, rows 8 apart', async () => {
    await open();
    for (const id of ['delete.removed.0.icon', 'delete.kept.3.icon']) {
      const icon = screen.getByTestId(id);
      expect(icon).toHaveProp('tintColor', colors.mutedForeground);
      expect(StyleSheet.flatten(icon.props.style)).toMatchObject({ width: 16, height: 16 });
    }
    for (const id of ['delete.removed.title', 'delete.kept.title']) {
      expect(StyleSheet.flatten(screen.getByTestId(id).props.style)).toMatchObject({
        fontSize: 14,
        fontFamily: fonts.semibold,
      });
    }
    expect(screen.getByTestId('delete.kept.title')).toHaveTextContent(
      'What the hospitals you applied to keep as their records',
    );
    expect(StyleSheet.flatten(screen.getByTestId('delete.kept').props.style)).toMatchObject({ gap: 8 });
  });

  it('cannot be sent without a password', async () => {
    await open();
    await fireEvent.press(screen.getByTestId('delete.submit'));
    expect(await screen.findByText('Enter your password to delete your account.')).toBeOnTheScreen();
    expect(requests).toHaveLength(0);
  });

  it('asks once more before deleting, and Cancel changes nothing', async () => {
    const alert = confirmWith('Cancel');
    await open();
    await typePassword();
    await fireEvent.press(screen.getByTestId('delete.submit'));
    expect(alert).toHaveBeenCalledTimes(1);
    expect(requests).toHaveLength(0);
    expect(screen.getByTestId('delete.screen')).toBeOnTheScreen();
  });

  it('deletes with the password, signs the phone out without calling the server again, and says why', async () => {
    confirmWith('Delete');
    await secureStorage.setItem(REFRESH_KEY, 'r1');
    await open();
    await typePassword();
    await fireEvent.press(screen.getByTestId('delete.submit'));
    await waitFor(() => expect(requests).toEqual([{ password: 'Passw0rd!' }]));
    expect(await screen.findByTestId('login.screen')).toBeOnTheScreen();
    expect(screen.getByText('Your account has been deleted.')).toBeOnTheScreen();
    expect(await secureStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(await secureStorage.getItem(REFRESH_KEY)).toBeNull();
    expect(others).toEqual([]);
  });

  it('a wrong password says so and keeps the account and the session', async () => {
    confirmWith('Delete');
    server.use(
      http.post(`${API}/api/account/delete`, () =>
        HttpResponse.json({ error: 'Incorrect password' }, { status: 400 }),
      ),
    );
    await open();
    await typePassword('wrong');
    await fireEvent.press(screen.getByTestId('delete.submit'));
    expect(await screen.findByTestId('delete.error')).toHaveTextContent('Incorrect password');
    expect(screen.getByTestId('delete.screen')).toBeOnTheScreen();
    expect(await secureStorage.getItem(TOKEN_KEY)).not.toBeNull();
  });

  it('too many tries, a server error and no network each have their own words', async () => {
    confirmWith('Delete');
    await open();
    await typePassword();
    server.use(
      http.post(`${API}/api/account/delete`, () =>
        HttpResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 }),
      ),
    );
    await fireEvent.press(screen.getByTestId('delete.submit'));
    expect(await screen.findByTestId('delete.error')).toHaveTextContent(
      'Too many attempts. Please try again later.',
    );
    server.use(
      http.post(`${API}/api/account/delete`, () => HttpResponse.json({ error: 'x' }, { status: 500 })),
    );
    await fireEvent.press(screen.getByTestId('delete.submit'));
    await waitFor(() =>
      expect(screen.getByTestId('delete.error')).toHaveTextContent('Failed to delete account'),
    );
    server.use(http.post(`${API}/api/account/delete`, () => HttpResponse.error()));
    await fireEvent.press(screen.getByTestId('delete.submit'));
    await waitFor(() =>
      expect(screen.getByTestId('delete.error')).toHaveTextContent(/connection|network|internet/i),
    );
    expect(await secureStorage.getItem(TOKEN_KEY)).not.toBeNull();
  });

  it('is reached from Settings, and the system back returns', async () => {
    await startSignedIn('/settings', 'settings.screen');
    await fireEvent.press(screen.getByTestId('settings.delete'));
    expect(await screen.findByTestId('delete.screen')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
    await act(async () => router.back());
    expect(await screen.findByTestId('settings.screen')).toBeOnTheScreen();
  });
});
