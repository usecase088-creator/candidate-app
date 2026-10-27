// Asks "are you sure?" before something that cannot be undone (D26). Native: the phone's own alert.
// The web build (used only for Playwright checks) has its own file, confirm.web.ts, because Alert.alert does nothing there.
import { Alert } from 'react-native';

export type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel: string;
  /** Red button. Default true: everything we confirm is final. */
  destructive?: boolean;
};

export function confirmAction({
  title,
  message,
  confirmLabel,
  destructive = true,
}: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
