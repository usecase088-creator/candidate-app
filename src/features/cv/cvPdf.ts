// CV → PDF on the phone (expo-print) → share sheet (expo-sharing). The website prints the page through the browser.
// The PDF holds personal data, so the copy in the cache is always deleted afterwards.
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { buildCvHtml } from './cvHtml';
import { buildCv } from './cvModel';

export type CvPdfResult = { ok: true } | { ok: false; reason: 'unavailable' | 'failed' };

/** Website file name: the name with spaces as dashes, plus "-CV.pdf". Nothing that could leave the cache folder. */
export function cvFileName(name: string): string {
  const base = name
    .replace(/[\\/]+/g, ' ')
    .replace(/\.{2,}/g, ' ')
    .trim()
    .replace(/[^\p{L}\p{N}._ -]/gu, '')
    .trim()
    .replace(/\s+/g, '-');
  return `${base || 'My'}-CV.pdf`;
}

export async function shareCvPdf(profile: Record<string, unknown>): Promise<CvPdfResult> {
  let file: File | undefined;
  try {
    if (!(await Sharing.isAvailableAsync())) return { ok: false, reason: 'unavailable' };
    const cv = buildCv(profile);
    const printed = await Print.printToFileAsync({ html: buildCvHtml(cv), width: 595, height: 842 });
    file = new File(printed.uri);
    try {
      const named = new File(Paths.cache, cvFileName(cv.name));
      try {
        named.delete();
      } catch {
        // Nothing from an earlier share to remove.
      }
      file.move(named);
    } catch {
      // Keep the printed name: sharing matters more than the file name.
    }
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: 'Your CV',
    });
    return { ok: true };
  } catch {
    return { ok: false, reason: 'failed' };
  } finally {
    try {
      file?.delete();
    } catch {
      // The system clears the cache folder anyway.
    }
  }
}
