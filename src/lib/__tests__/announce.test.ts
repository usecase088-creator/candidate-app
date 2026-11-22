import { AccessibilityInfo } from 'react-native';

import { announce, ANNOUNCE_DEDUPE_MS } from '../announce';

let now = 1_000_000;
beforeEach(() => {
  now += 10 * ANNOUNCE_DEDUPE_MS; // every test starts outside the window of the previous one
  jest.spyOn(Date, 'now').mockImplementation(() => now);
});
afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

// R3 a11y P1-1: VoiceOver does not speak role="alert" text, and TalkBack misses live regions on new Views.
describe('announce', () => {
  it('asks the screen reader to speak the message', () => {
    const spy = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    announce('Invalid email or password');
    expect(spy).toHaveBeenCalledWith('Invalid email or password');
  });

  it('ignores empty messages', () => {
    const spy = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    announce('');
    announce('   ');
    expect(spy).not.toHaveBeenCalled();
  });

  it('says the same message once when a toast and an inline box show it together, again later', () => {
    const spy = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    announce('Invalid OTP.');
    now += 20;
    announce('Invalid OTP.');
    expect(spy).toHaveBeenCalledTimes(1);
    announce('Something else');
    expect(spy).toHaveBeenCalledTimes(2);
    now += ANNOUNCE_DEDUPE_MS;
    announce('Something else');
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it('never throws (a platform without the API must not break a screen)', () => {
    jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {
      throw new Error('not supported');
    });
    expect(() => announce('x')).not.toThrow();
  });
});
