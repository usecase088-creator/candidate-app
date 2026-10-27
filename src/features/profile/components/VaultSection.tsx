import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { SupportingDocument } from '@/api/schemas/candidate';
import { Button } from '@/components/ui/Button';
import { AppText } from '@/components/ui/Text';
import { failureText } from '@/features/applications/messages';
import { pickVaultFiles } from '@/features/uploads/pickers';
import { uploadSupportingDocuments } from '@/features/uploads/uploadsApi';
import { colors, radius, spacing } from '@/theme/tokens';

type Props = {
  docs: SupportingDocument[];
  /** Called with the new full list once the files are uploaded; the screen saves it with the profile. */
  onUploaded: (next: SupportingDocument[]) => Promise<void>;
};

/**
 * Document vault (builder step 15): files kept ready for applications. PDF or Word, 5 MB each, up to 10 at a time,
 * as on the website. Uploaded at once, then saved together with the files already there.
 */
export function VaultSection({ docs, onUploaded }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function add() {
    setError(undefined);
    const res = await pickVaultFiles();
    if (res.kind === 'error') return setError(res.message);
    if (res.kind !== 'picked') return;
    setBusy(true);
    try {
      const uploaded = await uploadSupportingDocuments(res.files);
      const fresh = uploaded.map((u) => ({
        name: u.name ?? 'Document',
        url: u.url,
        publicId: u.publicId,
        mime: u.mime ?? null,
      }));
      await onUploaded([...docs, ...fresh]);
    } catch (e) {
      setError(
        e instanceof Error && !('kind' in e) ? e.message : failureText(e, 'Could not upload documents'),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.stack}>
      <AppText variant="label">Supporting files</AppText>
      <AppText variant="caption" color="mutedForeground">
        PDF or Word (.pdf, .doc, .docx), up to 5MB each
      </AppText>
      {docs.map((d, i) => (
        <View key={d.publicId ?? d.url} style={styles.row}>
          <AppText testID={`builder.vault.${i}`} numberOfLines={2}>
            {d.name}
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
