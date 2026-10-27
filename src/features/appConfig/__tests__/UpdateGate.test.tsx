import { useFonts } from 'expo-font';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import * as WebBrowser from 'expo-web-browser';
import { http, HttpResponse } from 'msw';
import { Platform, Text } from 'react-native';

import { appQueryClient } from '@/lib/queryClient';
import { appRoutes } from '@/test/appRoutes';
import { API } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';
import { resetAppState } from '@/test/startSignedIn';

import { useFlag } from '../useAppConfig';

jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: jest.fn() }));
jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn(() => Promise.resolve()),
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(() => Promise.resolve({ type: 'cancel' })),
}));

const config = (body: unknown, status = 200) =>
  server.use(http.get(`${API}/api/app-config`, () => HttpResponse.json(body as never, { status })));

beforeEach(() => {
  resetAppState();
  appQueryClient.clear();
  jest.mocked(useFonts).mockReturnValue([true, null]);
});

describe('force-update gate', () => {
  it('lets the app run when the installed version is new enough', async () => {
    config({ minVersion: { android: '1.0.0', ios: '1.0.0' }, flags: {} });
    await renderRouter(appRoutes, { initialUrl: '/login' });
    expect(await screen.findByTestId('login.screen')).toBeOnTheScreen();
    expect(screen.queryByTestId('update.screen')).toBeNull();
  });

  it('blocks the app with the update screen when the installed version is too old', async () => {
    Platform.OS = 'android';
    config({ minVersion: { android: '9.0.0', ios: '0.0.0' }, flags: {} });
    await renderRouter(appRoutes, { initialUrl: '/login' });
    expect(await screen.findByTestId('update.screen')).toBeOnTheScreen();
    expect(screen.getByText('Update required')).toBeOnTheScreen();
    expect(screen.queryByTestId('login.screen')).toBeNull();
  });

  it('uses the minimum of the phone it runs on', async () => {
    Platform.OS = 'ios';
    config({ minVersion: { android: '9.0.0', ios: '0.0.0' }, flags: {} });
    await renderRouter(appRoutes, { initialUrl: '/login' });
    expect(await screen.findByTestId('login.screen')).toBeOnTheScreen();
    Platform.OS = 'android';
  });

  it('the Update button opens the store page', async () => {
    Platform.OS = 'android';
    config({ minVersion: { android: '9.0.0', ios: '0.0.0' }, flags: {} });
    await renderRouter(appRoutes, { initialUrl: '/login' });
    await fireEvent.press(await screen.findByTestId('update.open'));
    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(
      expect.stringContaining('work.apronhanger.candidate'),
    );
  });

  it('fails open: a server error or a strange answer never blocks the app', async () => {
    config({ error: 'x' }, 500);
    await renderRouter(appRoutes, { initialUrl: '/login' });
    expect(await screen.findByTestId('login.screen')).toBeOnTheScreen();
  });

  it('fails open when the answer has the wrong shape', async () => {
    config({ minVersion: 'new', flags: [] });
    await renderRouter(appRoutes, { initialUrl: '/login' });
    expect(await screen.findByTestId('login.screen')).toBeOnTheScreen();
  });
});

describe('useFlag', () => {
  function Probe() {
    return <Text>{useFlag('vault', true) ? 'on' : 'off'}</Text>;
  }
  it('is the default until the server says otherwise, and the server wins after', async () => {
    config({ minVersion: { android: '0.0.0', ios: '0.0.0' }, flags: { vault: false } });
    await renderWithProviders(<Probe />);
    expect(screen.getByText('on')).toBeOnTheScreen();
    expect(await screen.findByText('off')).toBeOnTheScreen();
  });
});
