import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { AppText } from '@/components/ui/Text';
import { useAnnounce } from '@/components/ui/useAnnounce';
import { confirmAction } from '@/lib/confirm';
import { openAppSettings, type PickResult, pickGalleryPhotos, takePhoto } from '@/features/uploads/pickers';
import { colors, radius, spacing } from '@/theme/tokens';

import { useAvatar } from '../hooks/useAvatar';
import { type PhotoAction, PhotoSheet } from './PhotoSheet';

const BADGE = 28;
/** Pads the 28-pt badge's touch area to 44 without changing its drawn size. */
const BADGE_SLOP = (44 - BADGE) / 2;
const CAMERA = { ios: 'camera', android: 'photo_camera', web: 'photo_camera' } as const;

/**
 * Profile picture (D32 hero): 88-pt avatar with a brand ring and a camera badge. D32 R2 (issue 12): one control;
 * the avatar and the badge both open the photo sheet (Take photo / Choose from gallery / Remove photo / Cancel).
 * Same type and size rules as the website (5 MB).
 */
export function AvatarSection({ avatarUrl, name }: { avatarUrl?: string | null; name: string }) {
  const { set, remove } = useAvatar();
  const [sheet, setSheet] = useState(false);
  const [message, setMessage] = useState<string>();
  useAnnounce(message);
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

  function onPick(action: PhotoAction) {
    if (action === 'camera') void choose(takePhoto);
    else if (action === 'gallery') void choose(() => pickGalleryPhotos(false));
    else void onRemove();
  }

  const open = () => setSheet(true);
  return (
    <View style={styles.wrap}>
      <View style={styles.avatarWrap}>
        <PressableScale
          testID="profile.photo.open"
          accessibilityLabel="Profile photo"
          accessibilityHint="Opens the photo options"
          accessibilityState={{ busy }}
          disabled={busy}
          onPress={open}
          style={styles.avatarPress}
        >
          <Avatar testID="profile.photo" name={name} uri={avatarUrl} size={88} ring />
          {busy ? (
            <View testID="profile.photo.busy" style={styles.busy}>
              <ActivityIndicator color={colors.brandForeground} />
            </View>
          ) : null}
        </PressableScale>
        <PressableScale
          testID="profile.photo.change"
          accessibilityLabel="Change photo"
          // The avatar itself opens the same sheet: one element for screen readers, the badge is for touch only.
          accessible={false}
          importantForAccessibility="no"
          hitSlop={BADGE_SLOP}
          disabled={busy}
          onPress={open}
          style={styles.badge}
        >
          <Icon name={CAMERA} size={16} tintColor={colors.brandForeground} />
        </PressableScale>
      </View>
      <PhotoSheet
        visible={sheet}
        canRemove={Boolean(avatarUrl)}
        onClose={() => setSheet(false)}
        onPick={onPick}
      />
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
  wrap: { gap: spacing['2'], alignItems: 'center' },
  avatarWrap: { width: 88, height: 88 },
  avatarPress: { width: 88, height: 88, borderRadius: radius.full },
  busy: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.full,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
});
