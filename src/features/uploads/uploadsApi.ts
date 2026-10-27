// Sends files to the backend (docs/reference/API.md §20, §21). Type, size and count are checked first: the server
// answers 500 for a file that is too big, and a wrong file is better refused on the phone than after the upload.
// Progress and cancel come from the API client (src/api/createApiClient.ts upload).
import { z } from 'zod';

import { api, type UploadOptions } from '@/api/client';
import {
  ApplicationDocumentListSchema,
  type ApplicationDocument,
  type UploadedFile,
  UploadedFileListSchema,
  UploadedFileSchema,
} from '@/api/schemas/applications';

import {
  cleanFileName,
  mimeFromName,
  type PickedFile,
  validateAvatarFile,
  validateVaultFiles,
  validateCvFile,
  validateDocumentFiles,
} from './logic/files';

/** A file chosen on the phone: where it is, what it is called, and what the picker knew about it. */
export type PickedAsset = PickedFile & { uri: string };

/** React Native's FormData takes this object for a file on disk and streams it. */
type FilePart = { uri: string; name: string; type: string };

function appendFile(form: FormData, field: string, file: PickedAsset) {
  const part: FilePart = {
    uri: file.uri,
    name: cleanFileName(file.name),
    type: mimeFromName(file.name) ?? file.mime ?? 'application/octet-stream',
  };
  (form as unknown as { append(name: string, value: FilePart): void }).append(field, part);
}

export async function uploadCv(file: PickedAsset, opts: UploadOptions = {}): Promise<UploadedFile> {
  const problem = validateCvFile(file);
  if (problem) throw new Error(problem);
  const form = new FormData();
  appendFile(form, 'cv', file);
  return api.upload('/api/upload/cv', form, UploadedFileSchema, opts);
}

export async function uploadApplicationDocuments(
  applicationId: string,
  files: PickedAsset[],
  opts: UploadOptions = {},
): Promise<ApplicationDocument[]> {
  if (files.length === 0) throw new Error('Choose at least one file.');
  const problem = validateDocumentFiles(files);
  if (problem) throw new Error(problem);
  const form = new FormData();
  for (const file of files) appendFile(form, 'documents', file);
  return api.upload(
    `/api/applications/${encodeURIComponent(applicationId)}/documents`,
    form,
    ApplicationDocumentListSchema,
    opts,
  );
}

const AvatarResultSchema = z.object({ url: z.string(), publicId: z.string() }).loose();
const OkSchema = z.object({ success: z.boolean() }).loose();

/** Sets the profile picture; the server deletes the old one (API.md §23). */
export async function uploadAvatar(file: PickedAsset, opts: UploadOptions = {}) {
  const problem = validateAvatarFile(file);
  if (problem) throw new Error(problem);
  const form = new FormData();
  appendFile(form, 'avatar', file);
  return api.upload('/api/upload/avatar', form, AvatarResultSchema, opts);
}

export const deleteAvatar = () => api.delete('/api/upload/avatar', OkSchema);

/** Vault files: PDF or Word, 5 MB each, up to 10 at a time (API.md §22). The caller saves them with the profile. */
export async function uploadSupportingDocuments(files: PickedAsset[], opts: UploadOptions = {}) {
  const problem = validateVaultFiles(files);
  if (problem) throw new Error(problem);
  const form = new FormData();
  for (const file of files) appendFile(form, 'documents', file);
  return api.upload('/api/upload/documents', form, UploadedFileListSchema, opts);
}
