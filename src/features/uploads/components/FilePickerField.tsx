// Chooses files and shows them, with progress, cancel and retry for the upload that follows (Phase 3 task 3).
// Presentational: the screen owns the files and the upload (see useFileUpload). Website wording where it has some
// ("Choose Files", "No files selected", "{n} file(s) selected"). D32: no box of its own; the sources are small tonal
// buttons, each file is a row with a document icon and a middle-truncated name, the progress track is 4 pt.
import type { SymbolViewProps } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { AppText } from '@/components/ui/Text';
import { TextButton } from '@/components/ui/TextButton';
import { colors, MIN_TOUCH, radius, spacing } from '@/theme/tokens';

import { formatBytes } from '../logic/files';
import type { PickedAsset } from '../uploadsApi';

export type PickSource = 'files' | 'gallery' | 'camera';

export type UploadStatus =
  | { state: 'idle'; progress: number }
  | { state: 'uploading'; progress: number }
  | { state: 'error'; progress: number; message: string };

export type FilePickerFieldProps = {
  testID: string;
  title: string;
  hint?: string;
  files: PickedAsset[];
  sources: PickSource[];
  onPick: (source: PickSource) => void;
  onRemove: (index: number) => void;
  onCancel: () => void;
  onRetry: () => void;
  upload: UploadStatus;
  /** A file problem (type or size), shown under the files. */
  error?: string;
  disabled?: boolean;
  /** One file at a time (a CV): no "n file(s) selected" line. */
  single?: boolean;
};

const SOURCES: Record<PickSource, { label: string; spoken: string; icon: SymbolViewProps['name'] }> = {
  files: {
    label: 'Files',
    spoken: 'Choose from files',
    icon: { ios: 'folder', android: 'folder', web: 'folder' },
  },
  gallery: {
    label: 'Photos',
    spoken: 'Choose from photos',
    icon: { ios: 'photo', android: 'image', web: 'image' },
  },
  camera: {
    label: 'Camera',
    spoken: 'Take a photo',
    icon: { ios: 'camera', android: 'photo_camera', web: 'photo_camera' },
  },
};

const DOC_ICON = { ios: 'doc.fill', android: 'description', web: 'description' } as const;
const XMARK = { ios: 'xmark', android: 'close', web: 'close' } as const;

export function FilePickerField({
  testID,
  title,
  hint,
  files,
  sources,
  onPick,
  onRemove,
  onCancel,
  onRetry,
  upload,
  error,
  disabled = false,
  single = false,
}: FilePickerFieldProps) {
  const uploading = upload.state === 'uploading';
  const percent = Math.round(Math.min(1, Math.max(0, upload.progress)) * 100);

  return (
    <View testID={testID} style={styles.box}>
      <View style={styles.head}>
        <AppText variant="label">{title}</AppText>
        {hint ? (
          <AppText variant="secondary" color="mutedForeground">
            {hint}
          </AppText>
        ) : null}
      </View>

      {!uploading && (
        <View style={styles.sources}>
          {sources.map((source) => (
            <Button
              key={source}
              testID={`${testID}.pick.${source}`}
              label={SOURCES[source].label}
              accessibilityLabel={SOURCES[source].spoken}
              icon={SOURCES[source].icon}
              variant="secondary"
              size="sm"
              fullWidth={false}
              disabled={disabled}
              onPress={() => onPick(source)}
            />
          ))}
        </View>
      )}

      {!single && (
        <AppText variant="secondary" color="mutedForeground">
          {files.length > 0 ? `${files.length} file(s) selected` : 'No files selected'}
        </AppText>
      )}

      {files.map((file, index) => (
        <View key={`${file.uri}-${index}`} style={styles.row}>
          <Icon testID={`${testID}.file.${index}.icon`} name={DOC_ICON} size={20} tintColor={colors.brand} />
          <View style={styles.rowText}>
            <AppText weight="medium" numberOfLines={1} ellipsizeMode="middle">
              {file.name}
            </AppText>
            {formatBytes(file.size) ? (
              <AppText variant="caption" color="mutedForeground" tabular>
                {formatBytes(file.size)}
              </AppText>
            ) : null}
          </View>
          {!uploading && (
            <PressableScale
              testID={`${testID}.remove.${index}`}
              accessibilityLabel={`Remove ${file.name}`}
              disabled={disabled}
              pressScale={0.9}
              onPress={() => onRemove(index)}
              style={styles.remove}
            >
              <Icon name={XMARK} size={18} tintColor={colors.mutedForeground} />
            </PressableScale>
          )}
        </View>
      ))}

      {error ? (
        <AppText
          testID={`${testID}.error`}
          variant="secondary"
          color="errorText"
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
        >
          {error}
        </AppText>
      ) : null}

      {uploading && (
        <View style={styles.progressBlock}>
          <View
            testID={`${testID}.progress`}
            accessibilityRole="progressbar"
            accessibilityLabel="Upload progress"
            accessibilityValue={{ min: 0, max: 100, now: percent }}
            style={styles.track}
          >
            <View style={[styles.fill, { width: `${percent}%` }]} />
          </View>
          <View style={styles.progressRow}>
            <AppText variant="caption" color="mutedForeground" tabular accessibilityLiveRegion="polite">
              {percent > 0 ? `Uploading… ${percent}%` : 'Starting upload…'}
            </AppText>
            <TextButton
              testID={`${testID}.cancel`}
              label="Cancel upload"
              color="errorText"
              onPress={onCancel}
            />
          </View>
        </View>
      )}

      {upload.state === 'error' && (
        <View style={styles.progressBlock}>
          <AppText
            testID={`${testID}.upload.error`}
            variant="secondary"
            color="errorText"
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
          >
            {upload.message}
          </AppText>
          <Button
            testID={`${testID}.retry`}
            label="Try again"
            variant="secondary"
            size="sm"
            fullWidth={false}
            disabled={disabled}
            onPress={onRetry}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: spacing['3'] },
  // D32: label-to-content 6.
  head: { gap: spacing['1'] + spacing['0.5'] },
  sources: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing['2'] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['3'],
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    paddingLeft: spacing['3'],
    paddingRight: spacing['1'],
    paddingVertical: spacing['2'],
    minHeight: MIN_TOUCH,
  },
  rowText: { flexShrink: 1, flexGrow: 1 },
  remove: {
    width: MIN_TOUCH - 4,
    height: MIN_TOUCH - 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  progressBlock: { gap: spacing['2'] },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing['3'],
  },
  track: { height: 4, borderRadius: radius.full, backgroundColor: colors.muted, overflow: 'hidden' },
  fill: { height: 4, borderRadius: radius.full, backgroundColor: colors.brand },
});
