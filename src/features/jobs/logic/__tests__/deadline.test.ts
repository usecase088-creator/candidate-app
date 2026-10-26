import { daysLeft, deadlineInfo, formatDate, isExpired, isOpenableLink } from '../deadline';

const NOW = new Date('2026-10-26T12:00:00.000Z').getTime();

describe('deadline (website gov-jobs.tsx / foreign-jobs.tsx)', () => {
  it('formatDate is en-IN: 30 Nov 2026', () => {
    expect(formatDate('2026-11-30T00:00:00.000Z')).toBe('30 Nov 2026');
  });
  it('daysLeft rounds up', () => {
    expect(daysLeft('2026-10-27T00:00:00.000Z', NOW)).toBe(1);
    expect(daysLeft('2026-11-02T12:00:00.000Z', NOW)).toBe(7);
  });
  it('isExpired', () => {
    expect(isExpired('2026-10-25T00:00:00.000Z', NOW)).toBe(true);
    expect(isExpired('2026-10-27T00:00:00.000Z', NOW)).toBe(false);
  });

  it('no deadline: "No deadline"', () => {
    expect(deadlineInfo(null, NOW)).toEqual({ kind: 'none', text: 'No deadline', badge: null });
    expect(deadlineInfo(undefined, NOW).kind).toBe('none');
  });
  it('open: plain date', () => {
    expect(deadlineInfo('2026-12-31T00:00:00.000Z', NOW)).toEqual({
      kind: 'open',
      text: '31 Dec 2026',
      badge: null,
    });
  });
  it('7 days or fewer: amber with "{n}d left"', () => {
    expect(deadlineInfo('2026-10-30T00:00:00.000Z', NOW)).toEqual({
      kind: 'soon',
      text: '30 Oct 2026',
      badge: '4d left',
    });
  });
  it('expired: red "Expired · date", link disabled', () => {
    expect(deadlineInfo('2026-10-01T00:00:00.000Z', NOW)).toEqual({
      kind: 'expired',
      text: 'Expired · 1 Oct 2026',
      badge: null,
    });
  });
});

describe('isOpenableLink (only web links go to the in-app browser)', () => {
  it.each([
    ['https://example.gov.in/notice.pdf', true],
    ['http://example.org', true],
    ['HTTPS://EXAMPLE.ORG', true],
    ['javascript:alert(1)', false],
    ['file:///etc/passwd', false],
    ['intent://x#Intent;end', false],
    ['example.org/no-scheme', false],
    ['', false],
  ])('%s', (url, ok) => expect(isOpenableLink(url)).toBe(ok));
});
