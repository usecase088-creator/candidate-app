import * as SecureStore from 'expo-secure-store';

import { secureStorage } from '../secureStorage.native';
import { secureStorage as webStorage } from '../secureStorage.web';

const fake = SecureStore as typeof SecureStore & { __reset: () => void };

beforeEach(() => {
  fake.__reset();
  jest.clearAllMocks();
});

describe('secureStorage (native, expo-secure-store)', () => {
  it('stores, reads and deletes a value', async () => {
    await secureStorage.setItem('auth.token', 'abc');
    await expect(secureStorage.getItem('auth.token')).resolves.toBe('abc');
    await secureStorage.deleteItem('auth.token');
    await expect(secureStorage.getItem('auth.token')).resolves.toBeNull();
  });

  it('keeps values on this device only, readable after first unlock', async () => {
    await secureStorage.setItem('auth.token', 'abc');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('auth.token', 'abc', {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });
  });

  it('treats an unreadable entry (e.g. Android keystore reset) as missing and removes it', async () => {
    jest.mocked(SecureStore.getItemAsync).mockRejectedValueOnce(new Error('Could not decrypt'));
    await expect(secureStorage.getItem('auth.token')).resolves.toBeNull();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('auth.token', expect.anything());
  });

  it('does not throw if deleting fails', async () => {
    jest.mocked(SecureStore.deleteItemAsync).mockRejectedValueOnce(new Error('boom'));
    await expect(secureStorage.deleteItem('auth.token')).resolves.toBeUndefined();
  });

  it('lets write errors through (the caller must know the token was not saved)', async () => {
    jest.mocked(SecureStore.setItemAsync).mockRejectedValueOnce(new Error('full'));
    await expect(secureStorage.setItem('auth.token', 'abc')).rejects.toThrow('full');
  });
});

describe('secureStorage (web, memory only)', () => {
  it('has the same interface and never touches expo-secure-store', async () => {
    await webStorage.setItem('auth.token', 'abc');
    await expect(webStorage.getItem('auth.token')).resolves.toBe('abc');
    await webStorage.deleteItem('auth.token');
    await expect(webStorage.getItem('auth.token')).resolves.toBeNull();
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });
});
