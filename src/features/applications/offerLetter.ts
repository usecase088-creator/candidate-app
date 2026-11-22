// The offer letter: view it in the in-app browser, or download it and hand it to the phone's share sheet (Phase 3).
// The website's "View Offer Letter" button opens the home page instead of the letter; the app opens the letter.
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';

import { isOpenableLink } from '@/features/jobs/logic/deadline';

export type OfferLetterResult = { ok: true } | { ok: false; reason: 'invalid-link' | 'failed' };

export async function openOfferLetter(url: string): Promise<OfferLetterResult> {
  if (!isOpenableLink(url)) return { ok: false, reason: 'invalid-link' };
  try {
    await WebBrowser.openBrowserAsync(url);
    return { ok: true };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}

/**
 * Download into its own cache folder and share. An offer letter is a personal document, so the folder is emptied before
 * each download; the copy is NOT deleted when the share sheet returns: on Android that happens as soon as an app is
 * chosen, and that app reads the file after (deleting it gave an empty PDF). The system clears the cache folder too.
 */
export async function shareOfferLetter(url: string): Promise<OfferLetterResult> {
  if (!isOpenableLink(url)) return { ok: false, reason: 'invalid-link' };
  try {
    if (!(await Sharing.isAvailableAsync())) return openOfferLetter(url);
  } catch {
    return openOfferLetter(url);
  }
  let file: File | undefined;
  try {
    const dir = new Directory(Paths.cache, 'offer-letter');
    if (dir.exists) dir.delete();
    dir.create();
    file = await File.downloadFileAsync(url, dir);
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: 'Offer letter',
    });
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
