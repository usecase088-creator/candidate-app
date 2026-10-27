import { isOlderThan } from '../version';

describe('isOlderThan: is the installed app older than the minimum?', () => {
  it.each([
    ['1.0.0', '1.0.1', true],
    ['1.0.0', '1.1.0', true],
    ['1.9.9', '2.0.0', true],
    ['1.2.3', '1.2.3', false],
    ['1.2.4', '1.2.3', false],
    ['2.0.0', '1.99.99', false],
    ['1.10.0', '1.9.0', false],
    ['1.9.0', '1.10.0', true],
  ])('%s vs minimum %s → %s', (installed, minimum, expected) => {
    expect(isOlderThan(installed, minimum)).toBe(expected);
  });

  it('never forces an update when a version cannot be read', () => {
    expect(isOlderThan('', '1.0.0')).toBe(false);
    expect(isOlderThan('1.0.0', 'latest')).toBe(false);
    expect(isOlderThan('abc', 'def')).toBe(false);
  });

  it('accepts a build suffix on the installed version', () => {
    expect(isOlderThan('1.0.0-preview', '1.0.1')).toBe(true);
    expect(isOlderThan('1.0.1-preview', '1.0.1')).toBe(false);
  });
});
