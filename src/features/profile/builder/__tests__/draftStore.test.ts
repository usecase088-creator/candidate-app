import { fakeFiles, resetFakeFiles } from '@/test/fakeFileSystem';

import { emptyDraft } from '../model';
import { clearAllDrafts, clearDraft, keepPickedFile, loadDraft, saveDraft } from '../draftStore';

jest.mock('expo-file-system', () => jest.requireActual('@/test/fakeFileSystem').fakeFileSystemModule);

const sample = (over: Record<string, unknown> = {}) => ({
  step: 3,
  draft: { ...emptyDraft(), fullName: 'Dr. Draft' },
  pending: [],
  uploaded: [],
  ...over,
});

beforeEach(() => resetFakeFiles());

describe('profile draft on the phone', () => {
  it('keeps the draft of a user and gives it back', async () => {
    await saveDraft('user-a', sample());
    const back = await loadDraft('user-a');
    expect(back?.step).toBe(3);
    expect(back?.draft.fullName).toBe('Dr. Draft');
  });

  it('never gives one user the draft of another user on the same phone', async () => {
    await saveDraft('user-a', sample());
    expect(await loadDraft('user-b')).toBeNull();
  });

  it('refuses a file that claims to belong to someone else', async () => {
    await saveDraft('user-a', sample());
    const uri = [...fakeFiles.keys()].find((k) => k.endsWith('draft.json'))!;
    fakeFiles.set(uri, fakeFiles.get(uri)!.replace('"userId":"user-a"', '"userId":"user-b"'));
    expect(await loadDraft('user-a')).toBeNull();
  });

  it('treats a broken or old file as no draft', async () => {
    await saveDraft('user-a', sample());
    const uri = [...fakeFiles.keys()].find((k) => k.endsWith('draft.json'))!;
    fakeFiles.set(uri, '{not json');
    expect(await loadDraft('user-a')).toBeNull();
    fakeFiles.set(uri, JSON.stringify({ version: 0, userId: 'user-a' }));
    expect(await loadDraft('user-a')).toBeNull();
  });

  it('does nothing for an id that is not a plain id (no paths)', async () => {
    await saveDraft('../user-a', sample());
    expect(fakeFiles.size).toBe(0);
    expect(await loadDraft('../user-a')).toBeNull();
  });

  it('copies a picked file into the user draft folder, so a cleared cache does not lose it', async () => {
    fakeFiles.set('file:///cache/DocumentPicker/licence.pdf', 'pdf-bytes');
    const kept = await keepPickedFile('user-a', {
      uri: 'file:///cache/DocumentPicker/licence.pdf',
      name: 'licence.pdf',
      size: 9,
      mime: 'application/pdf',
    });
    expect(kept.uri).toMatch(/^file:\/\/\/docs\/profile-drafts\/user-a\/files\//);
    expect(kept.name).toBe('licence.pdf');
    expect(fakeFiles.get(kept.uri)).toBe('pdf-bytes');
  });

  it('clears the draft and its files of one user only', async () => {
    await saveDraft('user-a', sample());
    await saveDraft('user-b', sample());
    fakeFiles.set('file:///cache/x.pdf', 'x');
    await keepPickedFile('user-a', { uri: 'file:///cache/x.pdf', name: 'x.pdf', size: 1, mime: null });
    await clearDraft('user-a');
    expect(await loadDraft('user-a')).toBeNull();
    expect([...fakeFiles.keys()].some((k) => k.includes('/user-a/'))).toBe(false);
    expect(await loadDraft('user-b')).not.toBeNull();
  });

  it('clears every draft on the phone (sign-out, account deleted)', async () => {
    await saveDraft('user-a', sample());
    await saveDraft('user-b', sample());
    await clearAllDrafts();
    expect([...fakeFiles.keys()].filter((k) => k.includes('profile-drafts'))).toEqual([]);
  });

  it('clearing when there is nothing does not throw', async () => {
    await expect(clearDraft('user-a')).resolves.toBeUndefined();
    await expect(clearAllDrafts()).resolves.toBeUndefined();
  });
});
