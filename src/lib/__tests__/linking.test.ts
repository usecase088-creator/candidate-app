import { resolveLink, resolvePushData } from '../linking';

describe('resolveLink: website paths and app links become app routes', () => {
  it.each([
    ['/applications', '/applications'],
    ['/applications/abc-123', '/application/abc-123'],
    ['/jobs/job-9', '/job/job-9'],
    ['/apply/job-9', '/apply/job-9'],
    ['/profile', '/profile'],
    ['/saved-jobs', '/saved-jobs'],
    ['/gov-jobs', '/gov-jobs'],
    ['/foreign-jobs', '/intl-jobs'],
    ['/', '/'],
  ])('%s → %s', (input, expected) => expect(resolveLink(input)).toBe(expected));

  it('accepts the website host, with or without www, and the app schemes', () => {
    expect(resolveLink('https://apronhanger.work/jobs/job-9')).toBe('/job/job-9');
    expect(resolveLink('https://www.apronhanger.work/applications')).toBe('/applications');
    expect(resolveLink('apronhanger://jobs/job-9')).toBe('/job/job-9');
    expect(resolveLink('apronhanger-preview://applications/a1')).toBe('/application/a1');
  });

  it('ignores query strings and fragments, keeps ids safe', () => {
    expect(resolveLink('/jobs/job-9?utm_source=email#top')).toBe('/job/job-9');
    expect(resolveLink('/jobs/a%2Fb')).toBe('/job/a%2Fb');
  });

  it.each([
    null,
    undefined,
    '',
    '/settings',
    '/recruiter-applications',
    '/auth',
    '/jobs/',
    '/jobs/a/b',
    '/jobs/..%2Fadmin',
    'https://evil.example/jobs/1',
    'https://apronhanger.work.evil.example/jobs/1',
    'javascript:alert(1)',
    'http://apronhanger.work/jobs/1',
  ])('refuses %p', (input) => expect(resolveLink(input)).toBeNull());
});

describe('resolvePushData: what a push or a notification row carries', () => {
  it('prefers an explicit link', () => {
    expect(resolvePushData({ link: '/applications/a1' })).toBe('/application/a1');
  });
  it('falls back to ids', () => {
    expect(resolvePushData({ applicationId: 'a1' })).toBe('/application/a1');
    expect(resolvePushData({ jobId: 'j1' })).toBe('/job/j1');
  });
  it('ignores anything that is not a string and unknown shapes', () => {
    expect(resolvePushData({ link: 5, applicationId: {} })).toBeNull();
    expect(resolvePushData(null)).toBeNull();
    expect(resolvePushData('x')).toBeNull();
    expect(resolvePushData({})).toBeNull();
  });
});
