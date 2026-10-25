// Tokens live here and nowhere else (CLAUDE.md). Keychain (iOS) / Keystore-backed storage (Android).
import * as SecureStore from 'expo-secure-store';

import type { SecureStorage } from './secureStorage.types';

// This device only (not in backups); readable after the first unlock so background work can use it later.
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

async function deleteItem(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key, OPTIONS);
  } catch {
    // Nothing useful to do; the next write replaces it.
  }
}

export const secureStorage: SecureStorage = {
  async getItem(key) {
    try {
      return await SecureStore.getItemAsync(key, OPTIONS);
    } catch {
      // Android can lose the Keystore key (reinstall, backup restore). Treat as signed out instead of crashing.
      await deleteItem(key);
      return null;
    }
  },
  setItem: (key, value) => SecureStore.setItemAsync(key, value, OPTIONS),
  deleteItem,
};
