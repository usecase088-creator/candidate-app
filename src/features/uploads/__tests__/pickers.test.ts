// The phone's file, gallery and camera pickers (Phase 3 task 3). The native modules are mocked at their edge.
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Linking } from 'react-native';

import { openAppSettings, pickCv, pickDocuments, pickGalleryPhotos, takePhoto } from '../pickers';

jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
}));

const doc = jest.mocked(DocumentPicker.getDocumentAsync);
const gallery = jest.mocked(ImagePicker.launchImageLibraryAsync);
const camera = jest.mocked(ImagePicker.launchCameraAsync);
const askCamera = jest.mocked(ImagePicker.requestCameraPermissionsAsync);

const MB = 1024 * 1024;

beforeEach(() => jest.resetAllMocks());

describe('pickCv', () => {
  it('opens the system file picker for one PDF or Word file, copied to the app cache so it can be read', async () => {
    doc.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///cache/cv.pdf', name: 'cv.pdf', size: 2 * MB, mimeType: 'application/pdf' }],
    } as never);
    const result = await pickCv();
    expect(doc).toHaveBeenCalledWith(
      expect.objectContaining({
        multiple: false,
        copyToCacheDirectory: true,
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
      }),
    );
    expect(result).toEqual({
      kind: 'picked',
      files: [{ uri: 'file:///cache/cv.pdf', name: 'cv.pdf', size: 2 * MB, mime: 'application/pdf' }],
    });
  });

  it('cancel is a normal outcome, not an error', async () => {
    doc.mockResolvedValueOnce({ canceled: true, assets: null } as never);
    await expect(pickCv()).resolves.toEqual({ kind: 'cancelled' });
  });

  it('a picker that throws becomes an error result with plain words', async () => {
    doc.mockRejectedValueOnce(new Error('native boom'));
    await expect(pickCv()).resolves.toEqual({
      kind: 'error',
      message: 'Could not open your files. Please try again.',
    });
  });
});

describe('pickDocuments', () => {
  it('lets the user choose several PDFs or pictures', async () => {
    doc.mockResolvedValueOnce({
      canceled: false,
      assets: [
        { uri: 'file:///c/a.pdf', name: 'a.pdf', size: MB, mimeType: 'application/pdf' },
        { uri: 'file:///c/b.png', name: 'b.png', size: MB, mimeType: 'image/png' },
      ],
    } as never);
    const result = await pickDocuments();
    expect(doc).toHaveBeenCalledWith(
      expect.objectContaining({
        multiple: true,
        copyToCacheDirectory: true,
        type: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
      }),
    );
    expect(result.kind === 'picked' && result.files.map((f) => f.name)).toEqual(['a.pdf', 'b.png']);
  });

  it('an asset without a size or type is kept as it is (the file rules decide later)', async () => {
    doc.mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'file:///c/x', name: 'x' }] } as never);
    await expect(pickDocuments()).resolves.toEqual({
      kind: 'picked',
      files: [{ uri: 'file:///c/x', name: 'x', size: null, mime: null }],
    });
  });
});

describe('pickGalleryPhotos', () => {
  it('uses the system photo picker (no permission needed), images only, compressed to about 0.7, several allowed', async () => {
    gallery.mockResolvedValueOnce({
      canceled: false,
      assets: [
        {
          uri: 'file:///c/IMG_1.jpg',
          fileName: 'IMG_1.jpg',
          fileSize: 3 * MB,
          mimeType: 'image/jpeg',
          width: 4000,
          height: 3000,
        },
      ],
    } as never);
    const result = await pickGalleryPhotos();
    expect(gallery).toHaveBeenCalledWith(
      expect.objectContaining({
        mediaTypes: ['images'],
        quality: 0.7,
        allowsMultipleSelection: true,
        exif: false,
      }),
    );
    expect(askCamera).not.toHaveBeenCalled();
    expect(result).toEqual({
      kind: 'picked',
      files: [{ uri: 'file:///c/IMG_1.jpg', name: 'IMG_1.jpg', size: 3 * MB, mime: 'image/jpeg' }],
    });
  });

  it('gives a picture without a file name a readable one', async () => {
    gallery.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///c/abc-123', fileName: null, mimeType: 'image/jpeg', width: 1, height: 1 }],
    } as never);
    const result = await pickGalleryPhotos();
    expect(result.kind === 'picked' && result.files[0]?.name).toMatch(/^photo-\d+\.jpg$/);
  });

  it('cancel is not an error', async () => {
    gallery.mockResolvedValueOnce({ canceled: true, assets: null } as never);
    await expect(pickGalleryPhotos()).resolves.toEqual({ kind: 'cancelled' });
  });
});

describe('takePhoto', () => {
  it('asks for the camera permission first, then takes one photo compressed to about 0.7', async () => {
    askCamera.mockResolvedValueOnce({ granted: true, canAskAgain: true, status: 'granted' } as never);
    camera.mockResolvedValueOnce({
      canceled: false,
      assets: [
        {
          uri: 'file:///c/cam.jpg',
          fileName: 'cam.jpg',
          fileSize: MB,
          mimeType: 'image/jpeg',
          width: 1,
          height: 1,
        },
      ],
    } as never);
    const result = await takePhoto();
    expect(askCamera).toHaveBeenCalledTimes(1);
    expect(camera).toHaveBeenCalledWith(
      expect.objectContaining({ mediaTypes: ['images'], quality: 0.7, exif: false }),
    );
    expect(result.kind).toBe('picked');
  });

  it('permission denied: no camera screen, a "denied" result that says whether we can ask again', async () => {
    askCamera.mockResolvedValueOnce({ granted: false, canAskAgain: false, status: 'denied' } as never);
    await expect(takePhoto()).resolves.toEqual({ kind: 'denied', canAskAgain: false });
    expect(camera).not.toHaveBeenCalled();
    askCamera.mockResolvedValueOnce({ granted: false, canAskAgain: true, status: 'denied' } as never);
    await expect(takePhoto()).resolves.toEqual({ kind: 'denied', canAskAgain: true });
  });

  it('closing the camera is a cancel', async () => {
    askCamera.mockResolvedValueOnce({ granted: true, canAskAgain: true, status: 'granted' } as never);
    camera.mockResolvedValueOnce({ canceled: true, assets: null } as never);
    await expect(takePhoto()).resolves.toEqual({ kind: 'cancelled' });
  });

  it('a camera that throws (no camera, in use) is an error result with plain words', async () => {
    askCamera.mockResolvedValueOnce({ granted: true, canAskAgain: true, status: 'granted' } as never);
    camera.mockRejectedValueOnce(new Error('camera busy'));
    await expect(takePhoto()).resolves.toEqual({
      kind: 'error',
      message: 'Could not open the camera. Please try again.',
    });
  });
});

describe('openAppSettings', () => {
  it('sends the user to the phone settings for this app', async () => {
    const open = jest.spyOn(Linking, 'openSettings').mockResolvedValueOnce(undefined);
    await openAppSettings();
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('never throws when settings cannot be opened', async () => {
    jest.spyOn(Linking, 'openSettings').mockRejectedValueOnce(new Error('nope'));
    await expect(openAppSettings()).resolves.toBeUndefined();
  });
});
