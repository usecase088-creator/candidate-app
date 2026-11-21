import { relativeTime } from '../relativeTime';

// D32 notification rows: a short relative time on the title line ("5m ago"), falling back to the day after a week.
describe('relativeTime', () => {
  const now = new Date('2026-11-21T12:00:00.000Z');
  const at = (iso: string) => relativeTime(iso, now);

  it('says Just now under a minute', () => {
    expect(at('2026-11-21T11:59:40.000Z')).toBe('Just now');
    expect(at('2026-11-21T12:00:30.000Z')).toBe('Just now'); // a clock slightly ahead of the phone
  });

  it('counts minutes and hours', () => {
    expect(at('2026-11-21T11:55:00.000Z')).toBe('5m ago');
    expect(at('2026-11-21T09:00:00.000Z')).toBe('3h ago');
    expect(at('2026-11-20T13:00:00.000Z')).toBe('23h ago');
  });

  it('says Yesterday, then days, then the date', () => {
    expect(at('2026-11-20T10:00:00.000Z')).toBe('Yesterday');
    expect(at('2026-11-18T12:00:00.000Z')).toBe('3d ago');
    expect(at('2026-11-06T12:00:00.000Z')).toBe('6 Nov');
    expect(at('2025-12-24T12:00:00.000Z')).toBe('24 Dec 2025');
  });

  it('is empty for a date it cannot read', () => {
    expect(at('not a date')).toBe('');
  });
});
