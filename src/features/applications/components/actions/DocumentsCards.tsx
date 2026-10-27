// Document request and "Documents Submitted" (website: CandidateActionCard.tsx). Files come from the phone's file
// picker, photo picker or camera; type and size are checked on the phone first (the server answers 500 for a big file).
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Application } from '@/api/schemas/applications';
import { Button } from '@/components/ui/Button';
import { AppText } from '@/components/ui/Text';
import { useOpenLink } from '@/features/jobs/components/listings/useOpenLink';
import { FilePickerField, type PickSource } from '@/features/uploads/components/FilePickerField';
import { validateDocumentFiles } from '@/features/uploads/logic/files';
import {
  openAppSettings,
  type PickResult,
  pickDocuments,
  pickGalleryPhotos,
  takePhoto,
} from '@/features/uploads/pickers';
import type { PickedAsset } from '@/features/uploads/uploadsApi';
import { spacing } from '@/theme/tokens';

import { useUploadRequestedDocuments } from '../../hooks/useRespond';
import { CardFrame } from './CardFrame';

const PICKERS: Record<PickSource, () => Promise<PickResult>> = {
  files: pickDocuments,
  gallery: pickGalleryPhotos,
  camera: takePhoto,
};

export function DocumentsRequestCard({ application: a }: { application: Application }) {
  const upload = useUploadRequestedDocuments();
  const [files, setFiles] = useState<PickedAsset[]>([]);
  const [fileError, setFileError] = useState<string>();
  const [cameraBlocked, setCameraBlocked] = useState<'ask' | 'settings'>();
  const busy = upload.status.state === 'uploading';

  const pick = async (source: PickSource) => {
    const result = await PICKERS[source]();
    setCameraBlocked(undefined);
    if (result.kind === 'cancelled') return;
    if (result.kind === 'error') {
      setFileError(result.message);
      return;
    }
    if (result.kind === 'denied') {
      setCameraBlocked(result.canAskAgain ? 'ask' : 'settings');
      return;
    }
    const fresh = result.files.filter((f) => !files.some((have) => have.uri === f.uri));
    const combined = [...files, ...fresh];
    const problem = validateDocumentFiles(combined);
    setFileError(problem);
    if (!problem) setFiles(combined);
  };

  const send = async () => {
    const outcome = await upload.submit(a.id, files);
    if (outcome.ok) setFiles([]);
  };

  return (
    <CardFrame tone="document" title="Document Request">
      <AppText color="amberText">
        The hospital has requested the following documents to proceed with your application:
      </AppText>
      <View style={styles.list}>
        {a.requestedDocumentList.map((d) => (
          <AppText key={d} weight="medium" color="amberText">
            {`• ${d}`}
          </AppText>
        ))}
      </View>
      {a.documentRequestNote ? (
        <AppText variant="caption" color="amberText">
          {`Note: ${a.documentRequestNote}`}
        </AppText>
      ) : null}

      <FilePickerField
        testID="action.docs.files"
        title="Choose Files"
        hint="PDF, JPG, PNG or WebP, up to 5MB each"
        files={files}
        sources={['files', 'gallery', 'camera']}
        onPick={(source) => void pick(source)}
        onRemove={(i) => {
          setFiles(files.filter((_, at) => at !== i));
          setFileError(undefined);
        }}
        onCancel={upload.cancel}
        onRetry={() => void upload.retry().then((o) => o.ok && setFiles([]))}
        upload={upload.status}
        error={fileError}
      />

      {cameraBlocked === 'ask' && (
        <AppText
          testID="action.docs.camera"
          variant="caption"
          color="errorText"
          accessibilityLiveRegion="polite"
        >
          Allow camera access to take a photo of a document.
        </AppText>
      )}
      {cameraBlocked === 'settings' && (
        <View style={styles.list}>
          <AppText
            testID="action.docs.camera"
            variant="caption"
            color="errorText"
            accessibilityLiveRegion="polite"
          >
            Camera access is turned off for ApronHanger. You can turn it on in your phone settings.
          </AppText>
          <Button
            testID="action.docs.settings"
            label="Open Settings"
            variant="outline"
            fullWidth={false}
            onPress={() => void openAppSettings()}
          />
        </View>
      )}

      {files.length > 0 && !busy && upload.status.state !== 'error' && (
        <Button
          testID="action.docs.upload"
          label="Upload Documents"
          fullWidth={false}
          onPress={() => void send()}
        />
      )}
    </CardFrame>
  );
}

export function DocumentsSubmittedCard({ application: a }: { application: Application }) {
  const openLink = useOpenLink();
  return (
    <CardFrame tone="document" title="Documents Submitted">
      <AppText color="amberText">
        {
          "Your documents have been submitted and are under review by the hospital. You'll be notified once they are approved or if additional documents are required."
        }
      </AppText>
      {a.applicationDocuments.map((d, i) => (
        <Pressable
          key={d.id}
          testID={`action.submitted.open.${i}`}
          accessibilityRole="link"
          accessibilityLabel={`Open ${d.name}`}
          hitSlop={spacing['2']}
          onPress={() => openLink(d.url)}
          style={styles.doc}
        >
          <AppText variant="label" weight="medium" color="amberText" style={styles.underline}>
            {d.name}
          </AppText>
        </Pressable>
      ))}
    </CardFrame>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing['1'] },
  doc: { minHeight: 44, justifyContent: 'center' },
  underline: { textDecorationLine: 'underline' },
});
