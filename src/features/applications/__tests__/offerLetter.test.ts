// View, download and share the offer letter. The native modules are mocked at their edge.
import { File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';

import { openOfferLetter, shareOfferLetter } from '../offerLetter';

const mockDirDelete = jest.fn();
const mockDirCreate = jest.fn();
let mockDirExists = false;
jest.mock('expo-file-system', () => {
  const downloadFileAsync = jest.fn();
  class Directory {
    uri: string;
    constructor(...parts: (string | { uri: string })[]) {
      this.uri = parts.map((p) => (typeof p === 'string' ? p : p.uri)).join('');
    }
    get exists() {
      return mockDirExists;
    }
    delete = () => mockDirDelete(this.uri);
    create = () => mockDirCreate(this.uri);
  }
  return { File: { downloadFileAsync }, Directory, Paths: { cache: 'file:///cache/' } };
});
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn() }));

const download = jest.mocked(File.downloadFileAsync);
const available = jest.mocked(Sharing.isAvailableAsync);
const share = jest.mocked(Sharing.shareAsync);
const browser = jest.mocked(WebBrowser.openBrowserAsync);

const URL = 'https://res.example.test/offers/letter.pdf';
const deleteFile = jest.fn();
beforeEach(() => {
  jest.resetAllMocks();
  mockDirExists = false;
  download.mockResolvedValue({ uri: 'file:///cache/letter.pdf', delete: deleteFile } as never);
  available.mockResolvedValue(true);
  share.mockResolvedValue(undefined);
  browser.mockResolvedValue({ type: 'dismiss' } as never);
});

describe('openOfferLetter', () => {
  it('opens the letter in the in-app browser', async () => {
    await expect(openOfferLetter(URL)).resolves.toEqual({ ok: true });
    expect(browser).toHaveBeenCalledWith(URL);
  });

  it('refuses anything that is not a web link, without opening it', async () => {
    for (const bad of ['javascript:alert(1)', 'file:///etc/passwd', 'intent://x#Intent;end', '']) {
      await expect(openOfferLetter(bad)).resolves.toEqual({ ok: false, reason: 'invalid-link' });
    }
    expect(browser).not.toHaveBeenCalled();
  });

  it('a browser that cannot open says so instead of crashing', async () => {
    browser.mockRejectedValueOnce(new Error('no browser'));
    await expect(openOfferLetter(URL)).resolves.toEqual({ ok: false, reason: 'failed' });
  });
});

describe("shareOfferLetter (download, then the phone's share sheet)", () => {
  it('downloads into the cache and shares the PDF', async () => {
    await expect(shareOfferLetter(URL)).resolves.toEqual({ ok: true });
    expect(download).toHaveBeenCalledWith(URL, expect.objectContaining({ uri: 'file:///cache/offer-letter' }));
    expect(share).toHaveBeenCalledWith(
      'file:///cache/letter.pdf',
      expect.objectContaining({ mimeType: 'application/pdf', dialogTitle: 'Offer letter' }),
    );
  });

  it('keeps the copy after the sheet returns: on Android the chosen app reads it later (it opened an empty PDF)', async () => {
    await shareOfferLetter(URL);
    expect(deleteFile).not.toHaveBeenCalled();
  });

  it('clears the copy from an earlier share before downloading again (it is a personal document)', async () => {
    mockDirExists = true;
    await shareOfferLetter(URL);
    expect(mockDirDelete).toHaveBeenCalledWith('file:///cache/offer-letter');
    expect(mockDirDelete.mock.invocationCallOrder[0]).toBeLessThan(download.mock.invocationCallOrder[0] ?? 0);
    expect(mockDirCreate).toHaveBeenCalledWith('file:///cache/offer-letter');
  });

  it('still removes the copy when sharing fails', async () => {
    share.mockRejectedValueOnce(new Error('cancelled'));
    await expect(shareOfferLetter(URL)).resolves.toEqual({ ok: false, reason: 'failed' });
    expect(deleteFile).toHaveBeenCalledTimes(1);
  });

  it('a phone that cannot share falls back to the in-app browser', async () => {
    available.mockResolvedValueOnce(false);
    await expect(shareOfferLetter(URL)).resolves.toEqual({ ok: true });
    expect(share).not.toHaveBeenCalled();
    expect(browser).toHaveBeenCalledWith(URL);
  });

  it('a failed download is reported, nothing is shared', async () => {
    download.mockRejectedValueOnce(new Error('404'));
    await expect(shareOfferLetter(URL)).resolves.toEqual({ ok: false, reason: 'failed' });
    expect(share).not.toHaveBeenCalled();
  });

  it('refuses a link that is not a web link, without downloading', async () => {
    await expect(shareOfferLetter('file:///etc/passwd')).resolves.toEqual({
      ok: false,
      reason: 'invalid-link',
    });
    expect(download).not.toHaveBeenCalled();
  });
});
