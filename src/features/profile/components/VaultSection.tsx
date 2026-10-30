import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { SupportingDocument } from '@/api/schemas/candidate';
import { Button } from '@/components/ui/Button';
import { AppText } from '@/components/ui/Text';
import { keepPickedFile, type PendingFile } from '@/features/profile/builder/draftStore';
import { validateVaultFiles } from '@/features/uploads/logic/files';
import { pickVaultFiles } from '@/features/uploads/pickers';
import { colors, radius, spacing } from '@/theme/tokens';

type Props = {
  /** Files already on the server (and any uploaded by an unfinished save). */
  saved: SupportingDocument[];
  /** Picked files waiting for the final save. */
  waiting: PendingFile[];
  userId: string | undefined;
  onPicked: (files: PendingFile[]) => void;
};

/**
 * Document vault (builder step 15): files kept ready for applications. PDF or Word, 5 MB each, as on the website.
 * As on the website, picked files are uploaded with the final save; until then they are kept next to the draft.
 */
export function VaultSection({ saved, waiting, userId, onPicked }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function add() {
    setError(undefined);
    const res = await pickVaultFiles();
    if (res.kind === 'error') return setError(res.message);
    if (res.kind !== 'picked') return;
    const problem = validateVaultFiles(res.files);
    if (problem) return setError(problem);
    setBusy(true);
    try {
      const kept = userId
        ? await Promise.all(res.files.map((f) => keepPickedFile(userId, f)))
        : res.files.map((f) => ({ uri: f.uri, name: f.name, size: f.size ?? null, mime: f.mime ?? null }));
      onPicked(kept);
    } catch {
      setError('Could not add the file. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const names = [...saved.map((d) => d.name), ...waiting.map((f) => f.name)];
  return (
    <View style={styles.stack}>
      <AppText variant="label">Supporting files</AppText>
      <AppText variant="caption" color="mutedForeground">
        PDF or Word (.pdf, .doc, .docx), up to 5MB each
      </AppText>
      {names.map((name, i) => (
        <View key={`${i}.${name}`} style={styles.row}>
          <AppText testID={`builder.vault.${i}`} numberOfLines={2}>
            {name}
          </AppText>
        </View>
      ))}
      {error ? (
        <AppText testID="builder.vault.error" color="errorText" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
      <Button
        testID="builder.vault.add"
        label="Add files"
        variant="outline"
        loading={busy}
        disabled={busy}
        onPress={() => void add()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing['2'] },
  row: {
    padding: spacing['3'],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
});
