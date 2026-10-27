import {
  cleanFileName,
  CV_MAX_BYTES,
  DOCUMENT_MAX_BYTES,
  MAX_DOCUMENT_FILES,
  mimeFromName,
  PHOTO_QUALITY,
  validateCvFile,
  validateDocumentFiles,
} from '../files';

const MB = 1024 * 1024;
const file = (name: string, size: number, mime?: string) => ({ name, size, mime });

describe('limits', () => {
  it('are 5 MB for a CV and for each requested document, up to 15 documents (API.md §20, §21)', () => {
    expect(CV_MAX_BYTES).toBe(5 * MB);
    expect(DOCUMENT_MAX_BYTES).toBe(5 * MB);
    expect(MAX_DOCUMENT_FILES).toBe(15);
  });

  it('photos are compressed to about 0.7 before the size check, so normal phone photos fit', () => {
    expect(PHOTO_QUALITY).toBe(0.7);
  });
});

describe('mimeFromName', () => {
  it('knows the file types the app accepts', () => {
    expect(mimeFromName('cv.pdf')).toBe('application/pdf');
    expect(mimeFromName('CV.PDF')).toBe('application/pdf');
    expect(mimeFromName('cv.doc')).toBe('application/msword');
    expect(mimeFromName('cv.docx')).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    expect(mimeFromName('scan.jpg')).toBe('image/jpeg');
    expect(mimeFromName('scan.JPEG')).toBe('image/jpeg');
    expect(mimeFromName('scan.png')).toBe('image/png');
    expect(mimeFromName('scan.webp')).toBe('image/webp');
  });

  it('is undefined for anything else', () => {
    expect(mimeFromName('notes.txt')).toBeUndefined();
    expect(mimeFromName('noextension')).toBeUndefined();
    expect(mimeFromName('archive.pdf.zip')).toBeUndefined();
  });
});

describe('validateCvFile (website: fileToUploaded, PDF or Word up to 5MB)', () => {
  it('accepts PDF, DOC and DOCX by type or by name', () => {
    expect(validateCvFile(file('cv.pdf', MB, 'application/pdf'))).toBeUndefined();
    expect(validateCvFile(file('cv.docx', MB))).toBeUndefined();
    expect(validateCvFile(file('cv.doc', MB, 'application/octet-stream'))).toBeUndefined();
  });

  it('refuses other types with the website message', () => {
    const msg = 'Please upload a PDF or Word document (.pdf, .doc, .docx)';
    expect(validateCvFile(file('photo.jpg', MB, 'image/jpeg'))).toBe(msg);
    expect(validateCvFile(file('notes.txt', MB, 'text/plain'))).toBe(msg);
    expect(validateCvFile(file('cv', MB))).toBe(msg);
  });

  it('refuses a file over 5 MB with the website message (the server would answer 500)', () => {
    expect(validateCvFile(file('cv.pdf', 5 * MB, 'application/pdf'))).toBeUndefined();
    expect(validateCvFile(file('cv.pdf', 5 * MB + 1, 'application/pdf'))).toBe('File must be under 5MB');
  });

  it('checks the type before the size', () => {
    expect(validateCvFile(file('x.txt', 9 * MB))).toBe(
      'Please upload a PDF or Word document (.pdf, .doc, .docx)',
    );
  });

  it('an empty file is refused', () => {
    expect(validateCvFile(file('cv.pdf', 0, 'application/pdf'))).toBe(
      'This file is empty. Please choose another one.',
    );
  });

  it('a missing size (some pickers) is accepted here; the server and the byte count of the upload still protect it', () => {
    expect(validateCvFile({ name: 'cv.pdf', mime: 'application/pdf' })).toBeUndefined();
  });
});

describe('validateDocumentFiles (website: each <= 5MB; server: PDF, JPEG, PNG, WebP only)', () => {
  it('accepts PDF and the three image types', () => {
    const files = [
      file('a.pdf', MB, 'application/pdf'),
      file('b.jpg', MB, 'image/jpeg'),
      file('c.png', MB),
      file('d.webp', MB),
    ];
    expect(validateDocumentFiles(files)).toBeUndefined();
  });

  it('refuses Word files, which the website offers but the server rejects, and names the file', () => {
    expect(validateDocumentFiles([file('letter.docx', MB)])).toBe(
      '"letter.docx" is not a PDF or image. Please choose a PDF, JPG, PNG or WebP file.',
    );
  });

  it('refuses a file over 5 MB with the website message', () => {
    expect(validateDocumentFiles([file('big.pdf', 5 * MB + 1, 'application/pdf')])).toBe(
      '"big.pdf" exceeds 5MB. Please use a smaller file.',
    );
  });

  it('reports the first problem in the order chosen', () => {
    expect(
      validateDocumentFiles([file('ok.pdf', MB), file('bad.txt', MB), file('big.pdf', 9 * MB)]),
    ).toContain('"bad.txt"');
  });

  it('refuses more than 15 files', () => {
    const many = Array.from({ length: 16 }, (_, i) => file(`f${i}.pdf`, MB, 'application/pdf'));
    expect(validateDocumentFiles(many)).toBe('You can upload up to 15 files at a time.');
    expect(validateDocumentFiles(many.slice(0, 15))).toBeUndefined();
  });

  it('nothing chosen is not an error here (the screen keeps the button hidden)', () => {
    expect(validateDocumentFiles([])).toBeUndefined();
  });
});

describe('cleanFileName', () => {
  it('keeps a normal name', () => {
    expect(cleanFileName('Degree certificate.pdf')).toBe('Degree certificate.pdf');
  });

  it('removes folders and control characters, and gives pictures from the camera a readable name', () => {
    expect(cleanFileName('/data/user/0/app/cache/ImagePicker/abc.jpg')).toBe('abc.jpg');
    expect(cleanFileName('a\u0000b\nc.pdf')).toBe('abc.pdf');
    expect(cleanFileName('')).toBe('file');
    expect(cleanFileName('   ')).toBe('file');
  });

  it('is at most 100 characters and keeps the extension', () => {
    const long = `${'x'.repeat(150)}.pdf`;
    const cleaned = cleanFileName(long);
    expect(cleaned.length).toBeLessThanOrEqual(100);
    expect(cleaned.endsWith('.pdf')).toBe(true);
  });
});
