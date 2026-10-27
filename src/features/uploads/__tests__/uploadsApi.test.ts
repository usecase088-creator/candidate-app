// What goes into the multipart form for each upload, and what comes back (API.md §20, §21).
import { z } from 'zod';

import { api } from '@/api/client';
import { ApiError } from '@/api/errors';

import { uploadApplicationDocuments, uploadCv } from '../uploadsApi';

type Part = { field: string; value: unknown };

/** Captures what the real FormData is given, and what the API client sends to the transport. */
function capture() {
  const parts: Part[] = [];
  const append = jest.spyOn(FormData.prototype, 'append').mockImplementation(function (
    this: FormData,
    ...args: unknown[]
  ) {
    parts.push({ field: String(args[0]), value: args[1] });
  });
  const upload = jest.spyOn(api, 'upload');
  return { parts, append, upload };
}

afterEach(() => jest.restoreAllMocks());

const cvResult = {
  url: 'https://res.example.test/cv.pdf',
  publicId: 'cv/abc',
  name: 'my cv.pdf',
  mime: 'application/pdf',
};
const file = (over: Record<string, unknown> = {}) => ({
  uri: 'file:///cache/my%20cv.pdf',
  name: 'my cv.pdf',
  size: 120_000,
  mime: 'application/pdf',
  ...over,
});

describe('uploadCv', () => {
  it('POSTs one file in the field "cv" to /api/upload/cv and returns { url, publicId, name, mime }', async () => {
    const { parts, upload } = capture();
    upload.mockResolvedValueOnce(cvResult as never);
    await expect(uploadCv(file())).resolves.toEqual(cvResult);
    expect(upload).toHaveBeenCalledWith(
      '/api/upload/cv',
      expect.any(FormData),
      expect.anything(),
      expect.anything(),
    );
    expect(parts).toEqual([
      {
        field: 'cv',
        value: { uri: 'file:///cache/my%20cv.pdf', name: 'my cv.pdf', type: 'application/pdf' },
      },
    ]);
  });

  it('works out the type from the name when the picker gave none', async () => {
    const { parts, upload } = capture();
    upload.mockResolvedValueOnce(cvResult as never);
    await uploadCv(file({ name: 'resume.DOCX', mime: undefined }));
    expect(parts[0]?.value).toMatchObject({
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
  });

  it('cleans the file name (no folders or control characters)', async () => {
    const { parts, upload } = capture();
    upload.mockResolvedValueOnce(cvResult as never);
    await uploadCv(file({ name: '/storage/emulated/0/Download/cv\u0000.pdf' }));
    expect(parts[0]?.value).toMatchObject({ name: 'cv.pdf' });
  });

  it('passes progress and cancel on to the client', async () => {
    const { upload } = capture();
    upload.mockResolvedValueOnce(cvResult as never);
    const onProgress = jest.fn();
    const controller = new AbortController();
    await uploadCv(file(), { onProgress, signal: controller.signal });
    expect(upload.mock.calls[0]?.[3]).toEqual({ onProgress, signal: controller.signal });
  });

  it('a bad file never leaves the phone: wrong type and too big are refused with the website messages, nothing is sent', async () => {
    const { upload } = capture();
    await expect(uploadCv(file({ name: 'photo.jpg', mime: 'image/jpeg' }))).rejects.toThrow(
      'Please upload a PDF or Word document (.pdf, .doc, .docx)',
    );
    await expect(uploadCv(file({ size: 5 * 1024 * 1024 + 1 }))).rejects.toThrow('File must be under 5MB');
    expect(upload).not.toHaveBeenCalled();
  });

  it('server and network failures reach the caller as the ApiError they are', async () => {
    const { upload } = capture();
    upload.mockRejectedValueOnce(ApiError.fromHttp(400, { error: 'Invalid file type.' }));
    await expect(uploadCv(file())).rejects.toMatchObject({
      status: 400,
      serverMessage: 'Invalid file type.',
    });
    upload.mockRejectedValueOnce(ApiError.network());
    await expect(uploadCv(file())).rejects.toMatchObject({ kind: 'network' });
  });

  it('a reply without a url is a parse error (the schema is checked by the client)', async () => {
    const schemaSeen: z.ZodType[] = [];
    const { upload } = capture();
    upload.mockImplementationOnce((async (_p: string, _b: FormData, schema: z.ZodType) => {
      schemaSeen.push(schema);
      return schema.parse({ publicId: 'x' });
    }) as never);
    await expect(uploadCv(file())).rejects.toBeInstanceOf(z.ZodError);
  });
});

describe('uploadApplicationDocuments', () => {
  const docs = [
    file({ name: 'id.pdf' }),
    file({ uri: 'file:///cache/p.jpg', name: 'p.jpg', mime: 'image/jpeg' }),
  ];
  const reply = [
    { id: 'd1', applicationId: 'a1', name: 'id.pdf', url: 'https://x.test/id.pdf', mime: 'application/pdf' },
    { id: 'd2', applicationId: 'a1', name: 'p.jpg', url: 'https://x.test/p.jpg', mime: 'image/jpeg' },
  ];

  it('POSTs every file in the field "documents" to /api/applications/:id/documents', async () => {
    const { parts, upload } = capture();
    upload.mockResolvedValueOnce(reply as never);
    await expect(uploadApplicationDocuments('app 1', docs)).resolves.toHaveLength(2);
    expect(upload.mock.calls[0]?.[0]).toBe('/api/applications/app%201/documents');
    expect(parts.map((p) => p.field)).toEqual(['documents', 'documents']);
    expect(parts[1]?.value).toMatchObject({ name: 'p.jpg', type: 'image/jpeg' });
  });

  it('refuses a Word file, a file over 5 MB, an empty list and more than 15 files, sending nothing', async () => {
    const { upload } = capture();
    await expect(uploadApplicationDocuments('a', [file({ name: 'letter.docx' })])).rejects.toThrow(
      '"letter.docx" is not a PDF or image',
    );
    await expect(
      uploadApplicationDocuments('a', [file({ name: 'big.pdf', size: 6 * 1024 * 1024 })]),
    ).rejects.toThrow('"big.pdf" exceeds 5MB. Please use a smaller file.');
    await expect(uploadApplicationDocuments('a', [])).rejects.toThrow('Choose at least one file.');
    await expect(
      uploadApplicationDocuments(
        'a',
        Array.from({ length: 16 }, (_, i) => file({ name: `f${i}.pdf` })),
      ),
    ).rejects.toThrow('You can upload up to 15 files at a time.');
    expect(upload).not.toHaveBeenCalled();
  });

  it("the server's refusal keeps its words (HTTP 403 / 404 / 400)", async () => {
    const { upload } = capture();
    upload.mockRejectedValueOnce(
      ApiError.fromHttp(400, {
        error: 'Invalid file type: text/plain. Only PDF, JPEG, PNG, and WebP are allowed.',
      }),
    );
    await expect(uploadApplicationDocuments('a', docs)).rejects.toMatchObject({
      status: 400,
      serverMessage: 'Invalid file type: text/plain. Only PDF, JPEG, PNG, and WebP are allowed.',
    });
  });
});
