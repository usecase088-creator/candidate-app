import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/Text';
import { colors, spacing } from '@/theme/tokens';

import { NotificationBell } from './NotificationBell';

/** Top bar of the four tabs: the brand on the left, the notification bell on the right. Takes the top safe area. */
export function TopBar() {
  const insets = useSafeAreaInsets();
  return (
    <View testID="topbar" style={[styles.bar, { paddingTop: insets.top }]}>
      <AppText
        testID="topbar.brand"
        variant="heading"
        weight="bold"
        color="primary"
        numberOfLines={1}
        maxFontSizeMultiplier={1.5}
        style={styles.brand}
      >
        ApronHanger
      </AppText>
      <NotificationBell />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing['4'],
    paddingRight: spacing['2'],
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  brand: { flex: 1 },
});
