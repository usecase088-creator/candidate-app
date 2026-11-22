// CV → PDF on the phone (expo-print) → share sheet (expo-sharing). The website prints the page through the browser.
// The PDF holds personal data: it stays only in the app's private cache, and the next share replaces it.
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
    const named = new File(Paths.cache, cvFileName(cv.name));
    try {
      // The copy from an earlier share: it was kept for the app that received it, and is replaced now.
      named.delete();
    } catch {
      // Nothing from an earlier share to remove.
    }
    try {
      // SDK 58: move is asynchronous and updates file.uri when it is done. Not waiting for it shared the old path of
      // a file that was being moved away (the receiving app opened an empty PDF).
      await file.move(named);
    } catch {
      // Keep the printed name: sharing matters more than the file name.
    }
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: 'Your CV',
    });
    // Not deleted here: on Android the share sheet returns as soon as an app is chosen, and that app reads the file
    // after. It stays in the app's private cache (the system clears it) until the next share replaces it.
    return { ok: true };
  } catch {
    try {
      file?.delete();
    } catch {
      // The system clears the cache folder anyway.
    }
    return { ok: false, reason: 'failed' };
  }
}
