import { StyleSheet, View } from 'react-native';

import type { AppNotification } from '@/api/schemas/notifications';
import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { AppText } from '@/components/ui/Text';
import { colors, radius, spacing } from '@/theme/tokens';

import { NOTIFICATION_ICONS, notificationKind } from '../notificationKind';
import { relativeTime } from '../relativeTime';

const CIRCLE = 36;
const DOT = 8;
/** Separator inset under a row: padding 16 + circle 36 + gap 12. */
export const NOTIFICATION_ROW_INSET = spacing['4'] + CIRCLE + spacing['3'];

/**
 * D32 notification row (72 pt): icon circle by kind with a brand dot while unread, semibold title + relative time on
 * one line, message in two muted lines. Press feedback through PressableScale; the whole row is one spoken element.
 */
export function NotificationRow({ item, onPress }: { item: AppNotification; onPress: () => void }) {
  const testID = `notifications.item.${item.id}`;
  return (
    <PressableScale
      testID={testID}
      accessibilityLabel={`${item.read ? '' : 'Unread. '}${item.title}. ${item.message}`}
      pressScale={1}
      onPress={onPress}
      style={styles.row}
    >
      <View style={styles.circle}>
        <Icon
          testID={`${testID}.icon`}
          name={NOTIFICATION_ICONS[notificationKind(item)]}
          size={18}
          tintColor={colors.brand}
        />
        {!item.read ? <View testID={`${testID}.dot`} style={styles.dot} /> : null}
      </View>
      <View style={styles.text}>
        <View style={styles.titleLine}>
          <AppText
            testID={`${testID}.title`}
            weight={item.read ? 'medium' : 'semibold'}
            numberOfLines={2}
            style={styles.title}
          >
            {item.title}
          </AppText>
          <AppText
            testID={`${testID}.time`}
            variant="caption"
            color="mutedForeground"
            tabular
            numberOfLines={1}
          >
            {relativeTime(item.createdAt)}
          </AppText>
        </View>
        <AppText testID={`${testID}.message`} variant="secondary" color="mutedForeground" numberOfLines={2}>
          {item.message}
        </AppText>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing['3'],
    paddingHorizontal: spacing['4'],
    paddingVertical: spacing['3'],
  },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: radius.full,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: DOT,
    height: DOT,
    borderRadius: radius.full,
    backgroundColor: colors.brand,
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  text: { flex: 1, gap: spacing['0.5'] },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: spacing['2'] },
  title: { flex: 1 },
});
