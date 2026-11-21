import { notificationKind } from '../notificationKind';

// The server sends no type: the leading icon is picked from the words in the title and the link.
describe('notificationKind', () => {
  it('reads the kind from the title', () => {
    expect(notificationKind({ title: 'Interview scheduled', message: '', link: null })).toBe('interview');
    expect(notificationKind({ title: 'Offer sent', message: '', link: null })).toBe('offer');
    expect(notificationKind({ title: 'Documents requested', message: '', link: null })).toBe('documents');
    expect(notificationKind({ title: 'Application shortlisted', message: '', link: null })).toBe(
      'application',
    );
  });

  it('falls back to the link, then to other', () => {
    expect(notificationKind({ title: 'Update', message: '', link: '/applications/1' })).toBe('application');
    expect(notificationKind({ title: 'Welcome', message: 'Hello', link: '/profile' })).toBe('other');
  });

  it('is not fooled by case or by the message', () => {
    expect(notificationKind({ title: 'INTERVIEW on Friday', message: 'offer', link: null })).toBe(
      'interview',
    );
  });
});
