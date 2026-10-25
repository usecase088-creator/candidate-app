import { focusManager, onlineManager } from '@tanstack/react-query';
import * as Network from 'expo-network';
import { AppState, type AppStateStatus } from 'react-native';

import { ApiError } from '@/api/errors';

import { createQueryClient, setupFocusManager, setupOnlineManager } from '../queryClient';

// expo-network is a native module: replace it at the boundary and drive its events by hand.
jest.mock('expo-network', () => ({
  addNetworkStateListener: jest.fn(),
  getNetworkStateAsync: jest.fn(),
}));

type NetEvent = { isConnected?: boolean; isInternetReachable?: boolean };
const flush = () => new Promise((r) => setTimeout(r, 0));

describe('query retry policy', () => {
  const retry = createQueryClient().getDefaultOptions().queries?.retry as (n: number, e: unknown) => boolean;

  it.each([
    ['network', ApiError.network()],
    ['timeout', ApiError.timeout()],
    ['server error', ApiError.fromHttp(503, {})],
  ])('retries %s up to twice', (_label, error) => {
    expect(retry(0, error)).toBe(true);
    expect(retry(1, error)).toBe(true);
    expect(retry(2, error)).toBe(false);
  });

  it.each([
    ['401', ApiError.fromHttp(401, {})],
    ['404', ApiError.fromHttp(404, {})],
    ['429 (would only make the rate limit worse)', ApiError.fromHttp(429, {})],
    ['parse', ApiError.parse(200, '/x', [])],
    ['a non-API error', new Error('bug')],
  ])('never retries %s', (_label, error) => {
    expect(retry(0, error)).toBe(false);
  });

  it('never retries mutations (writes are not safe to repeat)', () => {
    expect(createQueryClient().getDefaultOptions().mutations?.retry).toBe(false);
  });
});

describe('setupOnlineManager (expo-network)', () => {
  let emit: (e: NetEvent) => void;
  const remove = jest.fn();

  beforeEach(() => {
    jest.mocked(Network.addNetworkStateListener).mockImplementation((listener) => {
      emit = listener as (e: NetEvent) => void;
      return { remove } as unknown as ReturnType<typeof Network.addNetworkStateListener>;
    });
    jest
      .mocked(Network.getNetworkStateAsync)
      .mockResolvedValue({ isConnected: true, isInternetReachable: true });
    remove.mockClear();
  });

  afterEach(() => onlineManager.setOnline(true));

  it('follows connection changes', async () => {
    const cleanup = setupOnlineManager();
    await flush();
    emit({ isConnected: false });
    expect(onlineManager.isOnline()).toBe(false);
    emit({ isConnected: true, isInternetReachable: true });
    expect(onlineManager.isOnline()).toBe(true);
    cleanup();
  });

  it('counts "connected but no internet" as offline', async () => {
    const cleanup = setupOnlineManager();
    await flush();
    emit({ isConnected: true, isInternetReachable: false });
    expect(onlineManager.isOnline()).toBe(false);
    cleanup();
  });

  it('treats an unknown reachability as online (Android reports it late)', async () => {
    const cleanup = setupOnlineManager();
    await flush();
    emit({ isConnected: true });
    expect(onlineManager.isOnline()).toBe(true);
    cleanup();
  });

  it('reads the current state at start, not only changes', async () => {
    jest.mocked(Network.getNetworkStateAsync).mockResolvedValue({ isConnected: false });
    const cleanup = setupOnlineManager();
    await flush();
    expect(onlineManager.isOnline()).toBe(false);
    cleanup();
  });

  it('removes the native listener on cleanup', () => {
    setupOnlineManager()();
    expect(remove).toHaveBeenCalled();
  });
});

describe('setupFocusManager (AppState)', () => {
  it('marks queries focused only while the app is active', () => {
    let handler: (s: AppStateStatus) => void = () => undefined;
    const remove = jest.fn();
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, h) => {
      handler = h as (s: AppStateStatus) => void;
      return { remove } as unknown as ReturnType<typeof AppState.addEventListener>;
    });
    const cleanup = setupFocusManager();
    handler('background');
    expect(focusManager.isFocused()).toBe(false);
    handler('active');
    expect(focusManager.isFocused()).toBe(true);
    cleanup();
    expect(remove).toHaveBeenCalled();
  });
});
