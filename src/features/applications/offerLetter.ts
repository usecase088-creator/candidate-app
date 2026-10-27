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

/** Download to the cache, share, and always delete the copy: an offer letter is a personal document. */
export async function shareOfferLetter(url: string): Promise<OfferLetterResult> {
  if (!isOpenableLink(url)) return { ok: false, reason: 'invalid-link' };
  try {
    if (!(await Sharing.isAvailableAsync())) return openOfferLetter(url);
  } catch {
    return openOfferLetter(url);
  }
  let file: File | undefined;
  try {
    file = await File.downloadFileAsync(url, new Directory(Paths.cache));
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: 'Offer letter',
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
