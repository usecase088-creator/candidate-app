// Web build only (Playwright checks): the browser's confirm box, because Alert.alert does nothing on react-native-web.
import type { ConfirmOptions } from './confirm';

export type { ConfirmOptions };

export function confirmAction({ title, message }: ConfirmOptions): Promise<boolean> {
  return Promise.resolve(globalThis.confirm(`${title}\n\n${message}`));
}
