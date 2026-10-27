// The native confirmation: the phone's own alert with Cancel and one destructive button.
import { Alert } from 'react-native';

import { confirmAction } from '../confirm';

afterEach(() => jest.restoreAllMocks());

const options = {
  title: 'Decline this interview?',
  message: 'This cannot be undone.',
  confirmLabel: 'Decline',
};

type Button = { text?: string; style?: string; onPress?: () => void };
const lastAlert = (spy: jest.SpyInstance) =>
  spy.mock.calls.at(-1) as [string, string, Button[], { onDismiss?: () => void; cancelable?: boolean }];

describe('confirmAction (native)', () => {
  it('shows the title and message with Cancel and the confirm button', async () => {
    const spy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    void confirmAction(options);
    const [title, message, buttons] = lastAlert(spy);
    expect(title).toBe('Decline this interview?');
    expect(message).toBe('This cannot be undone.');
    expect(buttons.map((b) => b.text)).toEqual(['Cancel', 'Decline']);
    expect(buttons[0]?.style).toBe('cancel');
    expect(buttons[1]?.style).toBe('destructive');
  });

  it('resolves true when the confirm button is pressed', async () => {
    const spy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const answer = confirmAction(options);
    lastAlert(spy)[2][1]?.onPress?.();
    await expect(answer).resolves.toBe(true);
  });

  it('resolves false on Cancel', async () => {
    const spy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const answer = confirmAction(options);
    lastAlert(spy)[2][0]?.onPress?.();
    await expect(answer).resolves.toBe(false);
  });

  it('resolves false when the alert is dismissed (tap outside, Android back)', async () => {
    const spy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const answer = confirmAction(options);
    const config = lastAlert(spy)[3];
    expect(config.cancelable).toBe(true);
    config.onDismiss?.();
    await expect(answer).resolves.toBe(false);
  });

  it('a non-destructive confirmation uses the default button style', async () => {
    const spy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    void confirmAction({ ...options, destructive: false });
    expect(lastAlert(spy)[2][1]?.style).toBe('default');
  });
});
