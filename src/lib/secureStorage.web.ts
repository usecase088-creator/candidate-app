// Expo web is only used for Playwright checks in development: memory only, gone on reload. Never a real token store.
import type { SecureStorage } from './secureStorage.types';

const memory = new Map<string, string>();

export const secureStorage: SecureStorage = {
  getItem: async (key) => memory.get(key) ?? null,
  setItem: async (key, value) => {
    memory.set(key, value);
  },
  deleteItem: async (key) => {
    memory.delete(key);
  },
};
