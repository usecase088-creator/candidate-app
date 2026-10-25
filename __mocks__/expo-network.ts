// Jest stand-in for the native expo-network module (used automatically for node_modules imports).
// Online by default; tests that need offline drive TanStack's onlineManager or mock this module themselves.
type Listener = (state: { isConnected?: boolean; isInternetReachable?: boolean }) => void;
const listeners = new Set<Listener>();

export const getNetworkStateAsync = jest.fn(async () => ({ isConnected: true, isInternetReachable: true }));

export const addNetworkStateListener = jest.fn((listener: Listener) => {
  listeners.add(listener);
  return { remove: () => listeners.delete(listener) };
});
