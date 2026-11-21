import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ListRow } from '@/components/ui/ListRow';
import { Icon } from '@/components/ui/Icon';
import { Separator } from '@/components/ui/Separator';
import { colors, radius, spacing } from '@/theme/tokens';

import { afterSheetClose } from './afterSheetClose';

export type PhotoAction = 'camera' | 'gallery' | 'remove';

const ICONS = {
  camera: { ios: 'camera', android: 'photo_camera', web: 'photo_camera' },
  gallery: { ios: 'photo.on.rectangle', android: 'photo_library', web: 'photo_library' },
  remove: { ios: 'trash', android: 'delete', web: 'delete' },
} as const;
const ICON_SIZE = 24;
/** Separator inset: padding 16 + icon 24 + gap 12. */
const ROW_INSET = spacing['4'] + ICON_SIZE + spacing['3'];

type Props = {
  visible: boolean;
  /** Offer "Remove photo" (only when there is a picture). */
  canRemove: boolean;
  onClose: () => void;
  onPick: (action: PhotoAction) => void;
};

/**
 * D32 R2 (issue 12): the one photo control. A bottom sheet over a scrim with a grabber and the options as rows:
 * Take photo, Choose from gallery, Remove photo (red, when there is one) and Cancel. The sheet closes first; the
 * chosen action runs once it is gone (afterSheetClose), so the camera or picker can present over the app.
 */
export function PhotoSheet({ visible, canRemove, onClose, onPick }: Props) {
  const insets = useSafeAreaInsets();
  if (!visible) return null;
  const pick = (action: PhotoAction) => {
    onClose();
    afterSheetClose(() => onPick(action));
  };
  const icon = (action: PhotoAction) => (
    <Icon
      name={ICONS[action]}
      size={ICON_SIZE}
      tintColor={action === 'remove' ? colors.errorText : colors.brand}
    />
  );
  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose} statusBarTranslucent>
      <Pressable
        testID="profile.photo.scrim"
        style={styles.scrim}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close"
      />
      <View
        testID="profile.photo.sheet"
        accessibilityViewIsModal
        style={[styles.sheet, { paddingBottom: insets.bottom + spacing['2'] }]}
      >
        <View style={styles.grabber} />
        <ListRow
          testID="profile.photo.camera"
          title="Take photo"
          leading={icon('camera')}
          trailing="none"
          onPress={() => pick('camera')}
        />
        <Separator inset={ROW_INSET} />
        <ListRow
          testID="profile.photo.gallery"
          title="Choose from gallery"
          leading={icon('gallery')}
          trailing="none"
          onPress={() => pick('gallery')}
        />
        {canRemove ? (
          <>
            <Separator inset={ROW_INSET} />
            <ListRow
              testID="profile.photo.remove"
              title="Remove photo"
              destructive
              leading={icon('remove')}
              trailing="none"
              onPress={() => pick('remove')}
            />
          </>
        ) : null}
        <Separator />
        <ListRow testID="profile.photo.cancel" title="Cancel" trailing="none" onPress={onClose} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingTop: spacing['2'],
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 5,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    marginBottom: spacing['2'],
  },
});
