import { Fragment, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { SupportingDocument } from '@/api/schemas/candidate';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { Separator } from '@/components/ui/Separator';
import { AppText } from '@/components/ui/Text';
import { useAnnounce } from '@/components/ui/useAnnounce';
import { useOpenLink } from '@/features/jobs/components/listings/useOpenLink';
import { keepPickedFile, type PendingFile } from '@/features/profile/builder/draftStore';
import { validateVaultFiles } from '@/features/uploads/logic/files';
import { pickVaultFiles } from '@/features/uploads/pickers';
import { colors, ICON_BUTTON, radius, shadows, spacing } from '@/theme/tokens';

type Props = {
  /** Files already on the server (and any uploaded by an unfinished save), minus the ones removed here. */
  saved: SupportingDocument[];
  /** Picked files waiting for the final save. */
  waiting: PendingFile[];
  userId: string | undefined;
  onPicked: (files: PendingFile[]) => void;
  /** Index into `waiting`. */
  onRemoveWaiting: (index: number) => void;
};

const DOC = { ios: 'doc.text', android: 'description', web: 'description' } as const;
const PLUS = { ios: 'plus', android: 'add', web: 'add' } as const;
const TRASH = { ios: 'trash', android: 'delete', web: 'delete' } as const;
const TRASH_SIZE = 20;
/** Separator inset: padding 16 + icon 24 + gap 12. */
const ROW_INSET = spacing['4'] + 24 + spacing['3'];

/**
 * Document vault (builder step 15, website FileUploadZone): files kept ready for applications. PDF or Word, 5 MB each,
 * as on the website. Picked files are uploaded with the final save; until then they are kept next to the draft. A saved
 * file opens in the in-app browser (website "Open"); a file picked now can be removed before the save (saved ones stay: the server keeps them).
 */
export function VaultSection({ saved, waiting, userId, onPicked, onRemoveWaiting }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  useAnnounce(error);
  const openLink = useOpenLink();

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

  const rows = [
    ...saved.map((d) => ({
      name: d.name,
      open: () => openLink(d.url),
      remove: null,
    })),
    ...waiting.map((f, i) => ({ name: f.name, open: null, remove: () => onRemoveWaiting(i) })),
  ];
  return (
    <View style={styles.stack}>
      <View style={styles.heading}>
        <AppText variant="label">Optional: keep supporting files ready for applications</AppText>
        <AppText variant="caption" color="mutedForeground">
          PDF or Word (.pdf, .doc, .docx), up to 5MB each
        </AppText>
      </View>
      {rows.length > 0 ? (
        <View testID="builder.vault.list" style={styles.list}>
          {rows.map((row, i) => (
            <Fragment key={`${i}.${row.name}`}>
              {i > 0 ? <Separator inset={ROW_INSET} /> : null}
              <View style={styles.row}>
                <Icon name={DOC} size={24} tintColor={colors.brand} />
                <AppText testID={`builder.vault.${i}`} numberOfLines={2} style={styles.name}>
                  {row.name}
                </AppText>
                {row.open ? (
                  <Button
                    testID={`builder.vault.${i}.open`}
                    label="Open"
                    accessibilityLabel={`Open ${row.name}`}
                    variant="ghost"
                    size="sm"
                    fullWidth={false}
                    onPress={row.open}
                  />
                ) : null}
                {row.remove ? (
                  <PressableScale
                    testID={`builder.vault.${i}.remove`}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${row.name}`}
                    onPress={row.remove}
                    style={styles.remove}
                  >
                    <Icon name={TRASH} size={TRASH_SIZE} tintColor={colors.mutedForeground} />
                  </PressableScale>
                ) : null}
              </View>
            </Fragment>
          ))}
        </View>
      ) : null}
      {error ? (
        <AppText
          testID="builder.vault.error"
          variant="secondary"
          color="errorText"
          accessibilityLiveRegion="polite"
        >
          {error}
        </AppText>
      ) : null}
      <Button
        testID="builder.vault.add"
        label="Browse files"
        variant="secondary"
        size="md"
        icon={PLUS}
        loading={busy}
        disabled={busy}
        onPress={() => void add()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing['3'] },
  heading: { gap: spacing['1'] },
  // D32 R2 (issue 13): the one card style: white, radius 12, soft shadow, no hairline border.
  list: {
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    boxShadow: shadows.soft,
  },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2'],
    paddingLeft: spacing['4'],
    paddingRight: spacing['2'],
    paddingVertical: spacing['2'],
  },
  name: { flex: 1, marginLeft: spacing['1'] },
  remove: {
    width: ICON_BUTTON,
    height: ICON_BUTTON,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
});
