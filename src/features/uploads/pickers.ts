// The phone's pickers: files, gallery, camera (Phase 3 task 3). Only camera access is asked for; the system
// document picker and photo picker need no permission (D26). Photos are compressed by the picker (quality ~0.7)
// before the 5 MB check, so normal phone photos are not refused.
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Linking } from 'react-native';

import type { PickedAsset } from './uploadsApi';
import { DOC, DOCX, PDF, PHOTO_QUALITY } from './logic/files';

export type PickResult =
  | { kind: 'picked'; files: PickedAsset[] }
  | { kind: 'cancelled' }
  | { kind: 'denied'; canAskAgain: boolean }
  | { kind: 'error'; message: string };

const FILES_ERROR = 'Could not open your files. Please try again.';
const GALLERY_ERROR = 'Could not open your photos. Please try again.';
const CAMERA_ERROR = 'Could not open the camera. Please try again.';

async function pickFiles(type: string[], multiple: boolean): Promise<PickResult> {
  try {
    const res = await DocumentPicker.getDocumentAsync({ type, multiple, copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.length) return { kind: 'cancelled' };
    return {
      kind: 'picked',
      files: res.assets.map((a) => ({
        uri: a.uri,
        name: a.name,
        size: a.size ?? null,
        mime: a.mimeType ?? null,
      })),
    };
  } catch {
    return { kind: 'error', message: FILES_ERROR };
  }
}

/** One PDF or Word file for "apply with your own CV". */
export const pickCv = () => pickFiles([PDF, DOC, DOCX], false);

/** PDFs and pictures for a document request. */
export const pickDocuments = () => pickFiles([PDF, 'image/jpeg', 'image/png', 'image/webp'], true);

function fromPhotos(res: ImagePicker.ImagePickerResult): PickResult {
  if (res.canceled || !res.assets?.length) return { kind: 'cancelled' };
  return {
    kind: 'picked',
    files: res.assets.map((a) => ({
      uri: a.uri,
      name: a.fileName || `photo-${Date.now()}.jpg`,
      size: a.fileSize ?? null,
      mime: a.mimeType ?? 'image/jpeg',
    })),
  };
}

export async function pickGalleryPhotos(multiple = true): Promise<PickResult> {
  try {
    return fromPhotos(
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: PHOTO_QUALITY,
        allowsMultipleSelection: multiple,
        exif: false,
      }),
    );
  } catch {
    return { kind: 'error', message: GALLERY_ERROR };
  }
}

export async function takePhoto(): Promise<PickResult> {
  try {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return { kind: 'denied', canAskAgain: permission.canAskAgain };
    return fromPhotos(
      await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: PHOTO_QUALITY, exif: false }),
    );
  } catch {
    return { kind: 'error', message: CAMERA_ERROR };
  }
}

/** After a camera "don't ask again": the only way back is the phone's settings for this app. */
export async function openAppSettings(): Promise<void> {
  try {
    await Linking.openSettings();
  } catch {
    // Nothing more to do: the screen already told the user where to go.
  }
}
