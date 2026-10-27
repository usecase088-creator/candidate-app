// Chooses files and shows them, with progress, cancel and retry for the upload that follows (Phase 3 task 3).
// Presentational: the screen owns the files and the upload (see useFileUpload). Website wording where it has some
// ("Choose Files", "No files selected", "{n} file(s) selected").
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
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

const SOURCE_LABELS: Record<PickSource, { label: string; spoken: string }> = {
  files: { label: 'Files', spoken: 'Choose from files' },
  gallery: { label: 'Photos', spoken: 'Choose from photos' },
  camera: { label: 'Camera', spoken: 'Take a photo' },
};

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
      <AppText variant="label" weight="semibold">
        {title}
      </AppText>
      {hint ? (
        <AppText variant="caption" color="mutedForeground">
          {hint}
        </AppText>
      ) : null}

      {!uploading && (
        <View style={styles.sources}>
          {sources.map((source) => (
            <View key={source} style={styles.source}>
              <Button
                testID={`${testID}.pick.${source}`}
                label={SOURCE_LABELS[source].label}
                accessibilityLabel={SOURCE_LABELS[source].spoken}
                variant="outline"
                disabled={disabled}
                onPress={() => onPick(source)}
              />
            </View>
          ))}
        </View>
      )}

      {!single && (
        <AppText variant="caption" color="mutedForeground">
          {files.length > 0 ? `${files.length} file(s) selected` : 'No files selected'}
        </AppText>
      )}

      {files.map((file, index) => (
        <View key={`${file.uri}-${index}`} style={styles.row}>
          <View style={styles.rowText}>
            <AppText variant="label" weight="medium" numberOfLines={2}>
              {file.name}
            </AppText>
            {formatBytes(file.size) ? (
              <AppText variant="caption" color="mutedForeground">
                {formatBytes(file.size)}
              </AppText>
            ) : null}
          </View>
          {!uploading && (
            <Pressable
              testID={`${testID}.remove.${index}`}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${file.name}`}
              accessibilityState={{ disabled }}
              disabled={disabled}
              hitSlop={spacing['2']}
              onPress={() => onRemove(index)}
              style={styles.remove}
            >
              <AppText variant="caption" weight="semibold" color="errorText">
                Remove
              </AppText>
            </Pressable>
          )}
        </View>
      ))}

      {error ? (
        <AppText
          testID={`${testID}.error`}
          variant="caption"
          color="errorText"
          accessibilityLiveRegion="polite"
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
          <AppText variant="caption" color="mutedForeground" accessibilityLiveRegion="polite">
            {percent > 0 ? `Uploading… ${percent}%` : 'Starting upload…'}
          </AppText>
          <TextButton
            testID={`${testID}.cancel`}
            label="Cancel upload"
            color="errorText"
            onPress={onCancel}
          />
        </View>
      )}

      {upload.state === 'error' && (
        <View style={styles.progressBlock}>
          <AppText
            testID={`${testID}.upload.error`}
            variant="caption"
            color="errorText"
            accessibilityLiveRegion="polite"
          >
            {upload.message}
          </AppText>
          <Button
            testID={`${testID}.retry`}
            label="Try again"
            variant="outline"
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
  box: {
    gap: spacing['2'],
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing['4'],
  },
  sources: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing['2'] },
  source: { flexGrow: 1, flexBasis: 90 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['3'],
    borderRadius: radius.lg,
    backgroundColor: colors.surface2,
    paddingHorizontal: spacing['3'],
    paddingVertical: spacing['2'],
    minHeight: MIN_TOUCH,
  },
  rowText: { flexShrink: 1, flexGrow: 1 },
  remove: { minHeight: MIN_TOUCH - 8, justifyContent: 'center', paddingHorizontal: spacing['2'] },
  progressBlock: { gap: spacing['2'] },
  track: { height: 8, borderRadius: radius.full, backgroundColor: colors.muted, overflow: 'hidden' },
  fill: { height: 8, borderRadius: radius.full, backgroundColor: colors.brand },
});
