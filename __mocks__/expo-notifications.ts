// Jest stand-in for the native expo-notifications module (used automatically for node_modules imports).
// No notification arrives unless a test calls the listener it captured with `emitNotificationResponse`.
type ResponseListener = (response: unknown) => void;
const responseListeners = new Set<ResponseListener>();

export const AndroidImportance = { DEFAULT: 3 };
export const setNotificationHandler = jest.fn();
export const setNotificationChannelAsync = jest.fn(async () => undefined);
export const getPermissionsAsync = jest.fn(async () => ({
  status: 'undetermined',
  granted: false,
  canAskAgain: true,
}));
export const requestPermissionsAsync = jest.fn(async () => ({
  status: 'granted',
  granted: true,
  canAskAgain: true,
}));
export const getExpoPushTokenAsync = jest.fn(async () => ({ type: 'expo', data: 'ExponentPushToken[mock]' }));
export const getLastNotificationResponseAsync = jest.fn(async (): Promise<unknown> => null);
export const addNotificationResponseReceivedListener = jest.fn((listener: ResponseListener) => {
  responseListeners.add(listener);
  return { remove: () => responseListeners.delete(listener) };
});

/** Test helper: the user tapped a notification whose payload is `data`. */
export function emitNotificationResponse(data: Record<string, unknown>) {
  const response = { notification: { request: { content: { data } } } };
  responseListeners.forEach((listener) => listener(response));
}
