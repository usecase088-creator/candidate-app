import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { AppText } from '@/components/ui/Text';
import { confirmAction } from '@/lib/confirm';
import { openAppSettings, type PickResult, pickGalleryPhotos, takePhoto } from '@/features/uploads/pickers';
import { colors, radius, spacing } from '@/theme/tokens';

import { useAvatar } from '../hooks/useAvatar';

const BADGE = 28;
/** Pads the 28-pt badge's touch area to 44 without changing its drawn size. */
const BADGE_SLOP = (44 - BADGE) / 2;
const CAMERA = { ios: 'camera', android: 'photo_camera', web: 'photo_camera' } as const;
const GALLERY = { ios: 'photo.on.rectangle', android: 'photo_library', web: 'photo_library' } as const;

/**
 * Profile picture (D32 hero): 88-pt avatar with a brand ring and a camera badge that opens the gallery, two small
 * actions under it (take / choose) and Remove when there is a picture. Same type and size rules as the website (5 MB).
 */
export function AvatarSection({ avatarUrl, name }: { avatarUrl?: string | null; name: string }) {
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
  const fromGallery = () => void choose(() => pickGalleryPhotos(false));

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
      <View style={styles.avatarWrap}>
        <Avatar testID="profile.photo" name={name} uri={avatarUrl} size={88} ring />
        <PressableScale
          testID="profile.photo.change"
          accessibilityLabel="Change photo"
          hitSlop={BADGE_SLOP}
          disabled={busy}
          onPress={fromGallery}
          style={styles.badge}
        >
          <Icon name={CAMERA} size={16} tintColor={colors.brandForeground} />
        </PressableScale>
      </View>
      <View style={styles.actions}>
        <Button
          testID="profile.photo.camera"
          label="Take photo"
          variant="secondary"
          size="sm"
          fullWidth={false}
          icon={CAMERA}
          disabled={busy}
          onPress={() => void choose(takePhoto)}
        />
        <Button
          testID="profile.photo.gallery"
          label="Choose from gallery"
          variant="secondary"
          size="sm"
          fullWidth={false}
          icon={GALLERY}
          loading={set.isPending}
          disabled={busy}
          onPress={fromGallery}
        />
      </View>
      {avatarUrl ? (
        <Button
          testID="profile.photo.remove"
          label="Remove photo"
          variant="destructiveText"
          size="sm"
          fullWidth={false}
          loading={remove.isPending}
          disabled={busy}
          onPress={() => void onRemove()}
        />
      ) : null}
      {message ? (
        <AppText
          testID="profile.photo.error"
          variant="secondary"
          color="errorText"
          align="center"
          accessibilityLiveRegion="polite"
        >
          {message}
        </AppText>
      ) : null}
      {denied ? (
        <Button
          testID="profile.photo.settings"
          label="Open settings"
          variant="secondary"
          size="sm"
          fullWidth={false}
          onPress={() => void openAppSettings()}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing['3'], alignItems: 'center' },
  avatarWrap: { width: 88, height: 88 },
  badge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: BADGE,
    height: BADGE,
    borderRadius: radius.full,
    backgroundColor: colors.brand,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing['2'],
  },
});
