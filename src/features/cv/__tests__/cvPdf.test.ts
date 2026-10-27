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
    move = (dest: { uri: string }) => {
      mockMove(this.uri, dest.uri);
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
  it('prints the page, names the file, shares it and removes the copy', async () => {
    const result = await shareCvPdf({ name: 'Dr. A', summary: 'Hello' });
    expect(result).toEqual({ ok: true });
    expect(print.mock.calls[0]?.[0]?.html).toContain('Dr. A');
    expect(mockMove).toHaveBeenCalledWith('file:///cache/Print-123.pdf', 'file:///cache/Dr.-A-CV.pdf');
    expect(share).toHaveBeenCalledWith(
      'file:///cache/Dr.-A-CV.pdf',
      expect.objectContaining({ mimeType: 'application/pdf' }),
    );
    expect(mockDelete).toHaveBeenCalled();
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
