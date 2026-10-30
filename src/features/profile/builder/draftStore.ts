// The profile form's draft, kept on the phone until the last step (website: the profile is saved only at "Save & generate
// CV", so a candidate becomes eligible for Quick Apply at the same point in both). One folder per user id, so another
// account on the same phone never sees it; everything is removed at sign-out. App-private storage, never logged.
import { Directory, File, Paths } from 'expo-file-system';

import type { SupportingDocument } from '@/api/schemas/candidate';
import type { PickedAsset } from '@/features/uploads/uploadsApi';
import { cleanFileName } from '@/features/uploads/logic/files';

import type { Draft } from './model';

/** A vault file picked on the phone, waiting for the final save. */
export type PendingFile = { uri: string; name: string; size: number | null; mime: string | null };

export type BuilderDraft = {
  step: number;
  draft: Draft;
  /** Picked, not uploaded yet. */
  pending: PendingFile[];
  /** Uploaded during a final save that did not finish: sent with the retry, never uploaded twice. */
  uploaded: SupportingDocument[];
};

const VERSION = 1;
const ROOT = 'profile-drafts';
const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;

const rootDir = () => new Directory(Paths.document, ROOT);
const userDir = (userId: string) => new Directory(Paths.document, ROOT, userId);
const draftFile = (userId: string) => new File(Paths.document, ROOT, userId, 'draft.json');

export async function loadDraft(userId: string): Promise<BuilderDraft | null> {
  if (!SAFE_ID.test(userId)) return null;
  try {
    const file = draftFile(userId);
    if (!file.exists) return null;
    const raw = JSON.parse(await file.text()) as Partial<BuilderDraft> & { version?: number; userId?: string };
    if (raw.version !== VERSION || raw.userId !== userId || !raw.draft || typeof raw.step !== 'number') return null;
    return {
      step: raw.step,
      draft: raw.draft,
      pending: Array.isArray(raw.pending) ? raw.pending : [],
      uploaded: Array.isArray(raw.uploaded) ? raw.uploaded : [],
    };
  } catch {
    return null;
  }
}

export async function saveDraft(userId: string, value: BuilderDraft): Promise<void> {
  if (!SAFE_ID.test(userId)) return;
  const dir = userDir(userId);
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  await draftFile(userId).write(JSON.stringify({ version: VERSION, userId, ...value }));
}

/** Copies a picked file next to the draft: the picker's copy sits in the cache, which the phone may empty. */
export async function keepPickedFile(userId: string, picked: PickedAsset): Promise<PendingFile> {
  if (!SAFE_ID.test(userId)) throw new Error('Invalid user');
  const name = cleanFileName(picked.name);
  const dir = new Directory(Paths.document, ROOT, userId, 'files');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  const dest = new File(Paths.document, ROOT, userId, 'files', `${Date.now()}-${name}`);
  await new File(picked.uri).copy(dest);
  return { uri: dest.uri, name, size: picked.size ?? null, mime: picked.mime ?? null };
}

function remove(dir: Directory) {
  try {
    if (dir.exists) dir.delete();
  } catch {
    // Nothing to remove, or the phone refused: never block sign-out or a save on it.
  }
}

export async function clearDraft(userId: string): Promise<void> {
  if (SAFE_ID.test(userId)) remove(userDir(userId));
}

export async function clearAllDrafts(): Promise<void> {
  remove(rootDir());
}
