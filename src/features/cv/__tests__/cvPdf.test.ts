// Make the CV into a PDF on the phone and hand it to the share sheet. Native modules are mocked at their edge.
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { cvFileName, shareCvPdf } from '../cvPdf';

const mockMove = jest.fn();
const mockDelete = jest.fn();
jest.mock('expo-file-system', () => ({
  File: class {
    uri: string;
    constructor(...parts: (string | { uri: string })[]) {
      this.uri = parts.map((p) => (typeof p === 'string' ? p : p.uri)).join('/');
    }
    // SDK 58: move is asynchronous and updates `uri` only once the file is in its new place.
    move = async (dest: { uri: string }) => {
      mockMove(this.uri, dest.uri);
      await new Promise((resolve) => setTimeout(resolve, 0));
      this.uri = dest.uri;
    };
    delete = mockDelete;
  },
  Paths: { cache: { uri: 'file:///cache' } },
}));
jest.mock('expo-print', () => ({ printToFileAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));

const print = jest.mocked(Print.printToFileAsync);
const available = jest.mocked(Sharing.isAvailableAsync);
const share = jest.mocked(Sharing.shareAsync);

beforeEach(() => {
  jest.resetAllMocks();
  print.mockResolvedValue({ uri: 'file:///cache/Print-123.pdf', numberOfPages: 1 });
  available.mockResolvedValue(true);
  share.mockResolvedValue(undefined);
});

describe('cvFileName', () => {
  it('uses the name like the website does (spaces become dashes) and stays safe as a file name', () => {
    expect(cvFileName('Dr. Ananya Sengupta')).toBe('Dr.-Ananya-Sengupta-CV.pdf');
    expect(cvFileName('../../etc/passwd')).toBe('etc-passwd-CV.pdf');
    expect(cvFileName('')).toBe('My-CV.pdf');
  });
});

describe('shareCvPdf', () => {
  it('prints the page, waits for the rename, then shares the named file', async () => {
    const result = await shareCvPdf({ name: 'Dr. A', summary: 'Hello' });
    expect(result).toEqual({ ok: true });
    expect(print.mock.calls[0]?.[0]?.html).toContain('Dr. A');
    expect(mockMove).toHaveBeenCalledWith('file:///cache/Print-123.pdf', 'file:///cache/Dr.-A-CV.pdf');
    // Bug (phone, 2026-11-23): the move was not awaited, so the sheet got the old path of a file being moved away
    // and the receiving app opened an empty PDF named after the print job.
    expect(share).toHaveBeenCalledWith(
      'file:///cache/Dr.-A-CV.pdf',
      expect.objectContaining({ mimeType: 'application/pdf' }),
    );
  });

  it('keeps the shared file after the sheet returns: on Android the chosen app reads it later', async () => {
    const shared: string[] = [];
    share.mockImplementation(async (uri) => {
      shared.push(uri);
    });
    await shareCvPdf({ name: 'Dr. A' });
    expect(shared).toEqual(['file:///cache/Dr.-A-CV.pdf']);
    // Only the copy left from an earlier share (same name) is removed, before the new one is moved in.
    expect(mockDelete).toHaveBeenCalledTimes(1);
    expect(mockDelete.mock.invocationCallOrder[0]).toBeLessThan(mockMove.mock.invocationCallOrder[0] ?? 0);
  });

  it('removes the printed file when sharing fails', async () => {
    share.mockRejectedValue(new Error('no app'));
    await expect(shareCvPdf({ name: 'A' })).resolves.toEqual({ ok: false, reason: 'failed' });
    expect(mockDelete).toHaveBeenCalledTimes(2);
  });

  it('says so when the phone cannot share', async () => {
    available.mockResolvedValue(false);
    await expect(shareCvPdf({ name: 'A' })).resolves.toEqual({ ok: false, reason: 'unavailable' });
    expect(share).not.toHaveBeenCalled();
  });

  it('still shares the printed file when renaming it fails', async () => {
    mockMove.mockImplementationOnce(() => {
      throw new Error('no');
    });
    await expect(shareCvPdf({ name: 'A' })).resolves.toEqual({ ok: true });
    expect(share).toHaveBeenCalledWith('file:///cache/Print-123.pdf', expect.anything());
  });

  it('reports a failure when printing fails, and shares nothing', async () => {
    print.mockRejectedValue(new Error('boom'));
    await expect(shareCvPdf({ name: 'A' })).resolves.toEqual({ ok: false, reason: 'failed' });
    expect(share).not.toHaveBeenCalled();
  });
});
