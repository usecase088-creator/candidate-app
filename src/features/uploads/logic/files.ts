// File rules for uploads (website: lib/fileUpload.ts, CandidateActionCard.tsx; server: API.md §20-22).
// The server answers 500 for an oversize CV or document, so size and type are checked before anything is sent.

export const MB = 1024 * 1024;
export const CV_MAX_BYTES = 5 * MB;
export const DOCUMENT_MAX_BYTES = 5 * MB;
export const MAX_DOCUMENT_FILES = 15;
/** Camera and gallery pictures are compressed by the picker to this quality before the size check. */
export const PHOTO_QUALITY = 0.7;

export const PDF = 'application/pdf';
export const DOC = 'application/msword';
export const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const BY_EXTENSION: Record<string, string> = {
  pdf: PDF,
  doc: DOC,
  docx: DOCX,
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export type PickedFile = { name: string; size?: number | null; mime?: string | null };

/** The type from a file name's extension (pickers sometimes report no type). */
export function mimeFromName(name: string): string | undefined {
  const match = /\.([a-z0-9]+)$/i.exec(name);
  if (!match) return undefined;
  return BY_EXTENSION[(match[1] ?? '').toLowerCase()];
}

/** The type we trust: the extension first (it is what the server's content check agrees with), then the picker's. */
function effectiveMime(file: PickedFile): string | undefined {
  return mimeFromName(file.name) ?? file.mime ?? undefined;
}

const CV_TYPES = new Set([PDF, DOC, DOCX]);
const DOCUMENT_TYPES = new Set([PDF, 'image/jpeg', 'image/png', 'image/webp']);

/** Website wording. Returns the error text, or undefined when the file is fine. */
export function validateCvFile(file: PickedFile): string | undefined {
  const mime = effectiveMime(file);
  if (!mime || !CV_TYPES.has(mime)) return 'Please upload a PDF or Word document (.pdf, .doc, .docx)';
  if (file.size === 0) return 'This file is empty. Please choose another one.';
  if (file.size != null && file.size > CV_MAX_BYTES) return 'File must be under 5MB';
  return undefined;
}

/** Requested documents: PDF or a picture, 5 MB each, up to 15. The first problem is reported. */
export function validateDocumentFiles(files: PickedFile[]): string | undefined {
  if (files.length > MAX_DOCUMENT_FILES) return `You can upload up to ${MAX_DOCUMENT_FILES} files at a time.`;
  for (const f of files) {
    const mime = effectiveMime(f);
    if (!mime || !DOCUMENT_TYPES.has(mime)) {
      return `"${f.name}" is not a PDF or image. Please choose a PDF, JPG, PNG or WebP file.`;
    }
    if (f.size === 0) return `"${f.name}" is empty. Please choose another one.`;
    if (f.size != null && f.size > DOCUMENT_MAX_BYTES) {
      return `"${f.name}" exceeds 5MB. Please use a smaller file.`;
    }
  }
  return undefined;
}

const AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/** Profile picture: JPG, PNG or WebP, 5 MB (API.md §23, website wording). */
export function validateAvatarFile(file: PickedFile): string | undefined {
  const mime = effectiveMime(file);
  if (!mime || !AVATAR_TYPES.has(mime))
    return 'Unsupported file format. Please upload a JPG, PNG, or WEBP image.';
  if (file.size != null && file.size > DOCUMENT_MAX_BYTES) return 'Profile picture must be less than 5MB.';
  return undefined;
}

export const MAX_VAULT_FILES = 10;

/** Vault files follow the CV rules (PDF or Word, 5 MB), up to 10 at once. The first problem is reported. */
export function validateVaultFiles(files: PickedFile[]): string | undefined {
  if (files.length > MAX_VAULT_FILES) return `You can upload up to ${MAX_VAULT_FILES} files at a time.`;
  for (const f of files) {
    const problem = validateCvFile(f);
    if (problem) return problem;
  }
  return undefined;
}

const MAX_NAME_LENGTH = 100;

/** A display and upload name: no folders, no control characters, at most 100 characters, extension kept. */
export function cleanFileName(raw: string): string {
  const base = (raw.split(/[\\/]/).pop() ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim();
  if (!base) return 'file';
  if (base.length <= MAX_NAME_LENGTH) return base;
  const ext = /\.[a-z0-9]{1,8}$/i.exec(base)?.[0] ?? '';
  return base.slice(0, MAX_NAME_LENGTH - ext.length) + ext;
}

/** "340 KB", "2.0 MB". Empty when the size is not known. */
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null) return '';
  if (bytes >= MB) return `${(bytes / MB).toFixed(1)} MB`;
  return `${Math.max(bytes === 0 ? 0 : 1, Math.round(bytes / 1024))} KB`;
}
