import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { AppText } from '@/components/ui/Text';
import { confirmAction } from '@/lib/confirm';
import { openAppSettings, type PickResult, pickGalleryPhotos, takePhoto } from '@/features/uploads/pickers';
import { colors, radius, spacing } from '@/theme/tokens';

import { useAvatar } from '../hooks/useAvatar';

const SIZE = 88;

/** Profile picture: take one, choose one, or remove it. Same type and size rules as the website (5 MB). */
export function AvatarSection({ avatarUrl, initials }: { avatarUrl?: string | null; initials: string }) {
  const { set, remove } = useAvatar();
  const [message, setMessage] = useState<string>();
  const [denied, setDenied] = useState(false);
  const busy = set.isPending || remove.isPending;

  async function choose(pick: () => Promise<PickResult>) {
    setMessage(undefined);
    setDenied(false);
    const res = await pick();
    if (res.kind === 'denied') {
      setDenied(!res.canAskAgain);
      setMessage('Camera access is needed to take a photo.');
    } else if (res.kind === 'error') setMessage(res.message);
    else if (res.kind === 'picked' && res.files[0]) {
      set.mutate(res.files[0], { onError: (e) => setMessage(e.message) });
    }
  }

  async function onRemove() {
    const ok = await confirmAction({
      title: 'Remove profile picture?',
      message: 'Your picture will be deleted.',
      confirmLabel: 'Remove',
    });
    if (ok) remove.mutate(undefined, { onError: (e) => setMessage(e.message) });
  }

  return (
    <View style={styles.wrap}>
      {avatarUrl ? (
        <Image
          testID="profile.photo"
          source={{ uri: avatarUrl }}
          contentFit="cover"
          accessibilityLabel="Your profile picture"
          style={styles.avatar}
        />
      ) : (
        <View testID="profile.photo.initials" style={[styles.avatar, styles.fallback]}>
          <AppText variant="heading">{initials}</AppText>
        </View>
      )}
      <View style={styles.buttons}>
        <Button
          testID="profile.photo.camera"
          label="Take photo"
          variant="outline"
          disabled={busy}
          onPress={() => void choose(takePhoto)}
        />
        <Button
          testID="profile.photo.gallery"
          label="Choose from gallery"
          variant="outline"
          loading={set.isPending}
          disabled={busy}
          onPress={() => void choose(() => pickGalleryPhotos(false))}
        />
        {avatarUrl ? (
          <Button
            testID="profile.photo.remove"
            label="Remove photo"
            variant="ghost"
            loading={remove.isPending}
            disabled={busy}
            onPress={() => void onRemove()}
          />
        ) : null}
      </View>
      {message ? (
        <AppText testID="profile.photo.error" color="errorText" accessibilityLiveRegion="polite">
          {message}
        </AppText>
      ) : null}
      {denied ? (
        <Button
          testID="profile.photo.settings"
          label="Open settings"
          variant="outline"
          onPress={() => void openAppSettings()}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing['3'], alignItems: 'center' },
  avatar: { width: SIZE, height: SIZE, borderRadius: radius.full },
  fallback: { backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  buttons: { gap: spacing['2'], alignSelf: 'stretch' },
});
