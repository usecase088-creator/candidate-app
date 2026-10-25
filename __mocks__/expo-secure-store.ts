// Jest stand-in for the native expo-secure-store module (Jest uses root __mocks__ for node_modules automatically).
// In-memory, with jest.fn wrappers so tests can check options or make a call fail.
const store = new Map<string, string>();

export const AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY = 5;
export const WHEN_UNLOCKED_THIS_DEVICE_ONLY = 6;

export const getItemAsync = jest.fn(async (key: string) => store.get(key) ?? null);
export const setItemAsync = jest.fn(async (key: string, value: string) => {
  store.set(key, value);
});
export const deleteItemAsync = jest.fn(async (key: string) => {
  store.delete(key);
});

/** Test helper: empty the fake keychain. */
export function __reset() {
  store.clear();
}
