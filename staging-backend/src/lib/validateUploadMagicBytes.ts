import { fromBuffer } from 'file-type';

const ALLOWED_DETECTED_MIMES = new Set([
  'application/pdf',
  'application/msword',
  'application/x-cfb', // Legacy .doc (OLE compound file)
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/zip', // Some valid DOCX files are detected as zip (PK\x03\x04)
  'image/jpeg',
  'image/png',
  'image/webp',
]);

/** Magic-byte check — confirms buffer content matches an allowed MIME type. */
export async function validateUploadMagicBytes(
  buffer: Buffer,
  allowedMimes: Set<string> = ALLOWED_DETECTED_MIMES,
): Promise<boolean> {
  const detected = await fromBuffer(buffer.slice(0, 4100));
  if (!detected?.mime) return false;
  return allowedMimes.has(detected.mime);
}

export const PDF_ONLY_DETECTED_MIMES = new Set(['application/pdf']);
