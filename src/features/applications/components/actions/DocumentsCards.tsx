// Document request and "Documents Submitted" (website: CandidateActionCard.tsx). Files come from the phone's file
// picker, photo picker or camera; type and size are checked on the phone first (the server answers 500 for a big file).
// D32: the panel wears the status tone: amber (needs you) for the request, blue (waiting) once submitted; the file
// chooser is the shared FilePickerField; the Upload button appears once a file is chosen (the Maestro flow scrolls to it).
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Application } from '@/api/schemas/applications';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
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
import { colors, radius, spacing } from '@/theme/tokens';

import { useUploadRequestedDocuments } from '../../hooks/useRespond';
import { CardFrame } from './CardFrame';

const PICKERS: Record<PickSource, () => Promise<PickResult>> = {
  files: pickDocuments,
  gallery: pickGalleryPhotos,
  camera: takePhoto,
};

const DOC = { ios: 'doc.text', android: 'description', web: 'description' } as const;
const OPEN = { ios: 'arrow.up.right.square', android: 'open_in_new', web: 'open_in_new' } as const;

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
    <CardFrame status={a.status} icon={DOC} title="Document Request">
      <View style={styles.body}>
        <AppText>
          The hospital has requested the following documents to proceed with your application:
        </AppText>
        <View style={styles.checklist}>
          {a.requestedDocumentList.map((d) => (
            <View key={d} style={styles.checkRow}>
              <Icon name={DOC} size={18} tintColor={colors.amberText} />
              <AppText variant="label" style={styles.checkText}>
                {`• ${d}`}
              </AppText>
            </View>
          ))}
        </View>
        {a.documentRequestNote ? (
          <AppText variant="secondary" color="mutedForeground">
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
            variant="secondary"
            color="errorText"
            accessibilityLiveRegion="polite"
          >
            Allow camera access to take a photo of a document.
          </AppText>
        )}
        {cameraBlocked === 'settings' && (
          <View style={styles.body}>
            <AppText
              testID="action.docs.camera"
              variant="secondary"
              color="errorText"
              accessibilityLiveRegion="polite"
            >
              Camera access is turned off for ApronHanger. You can turn it on in your phone settings.
            </AppText>
            <Button
              testID="action.docs.settings"
              label="Open Settings"
              variant="secondary"
              size="sm"
              fullWidth={false}
              onPress={() => void openAppSettings()}
            />
          </View>
        )}

        {files.length > 0 && !busy && upload.status.state !== 'error' && (
          <Button
            testID="action.docs.upload"
            label="Upload Documents"
            size="md"
            haptic="medium"
            onPress={() => void send()}
          />
        )}
      </View>
    </CardFrame>
  );
}

export function DocumentsSubmittedCard({ application: a }: { application: Application }) {
  const openLink = useOpenLink();
  return (
    <CardFrame status={a.status} icon={DOC} title="Documents Submitted">
      <View style={styles.body}>
        <AppText>
          {
            "Your documents have been submitted and are under review by the hospital. You'll be notified once they are approved or if additional documents are required."
          }
        </AppText>
        <View style={styles.files}>
          {a.applicationDocuments.map((d, i) => (
            <PressableScale
              key={d.id}
              testID={`action.submitted.open.${i}`}
              accessibilityRole="link"
              accessibilityLabel={`Open ${d.name}`}
              pressScale={1}
              onPress={() => openLink(d.url)}
              style={styles.fileRow}
            >
              <Icon name={DOC} size={20} tintColor={colors.skyText} />
              <AppText variant="label" numberOfLines={2} style={styles.checkText}>
                {d.name}
              </AppText>
              <Icon name={OPEN} size={18} tintColor={colors.mutedForeground} />
            </PressableScale>
          ))}
        </View>
      </View>
    </CardFrame>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing['3'] },
  checklist: { gap: spacing['1'] },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing['2'], minHeight: 28 },
  checkText: { flex: 1 },
  files: { gap: spacing['2'] },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['3'],
    minHeight: 48,
    paddingHorizontal: spacing['3'],
    paddingVertical: spacing['2'],
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
});
