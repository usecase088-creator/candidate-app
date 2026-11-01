import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { AppText } from '@/components/ui/Text';
import { colors, radius, spacing } from '@/theme/tokens';

/** Website VerifiedBadge: "Verified" (cards) or "Verified Hospital" (details). */
export function VerifiedBadge({ label = 'Verified' }: { label?: string }) {
  return (
    <View style={styles.badge} accessible accessibilityLabel={label}>
      <Icon
        name={{ ios: 'checkmark.shield.fill', android: 'verified_user', web: 'verified_user' }}
        tintColor={colors.primary}
        size={12}
      />
      <AppText variant="caption" weight="medium" color="primary">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['1'],
    alignSelf: 'flex-start',
    backgroundColor: colors.brandSoft,
    borderRadius: radius.full,
    paddingHorizontal: spacing['2'],
    paddingVertical: 2,
  },
});
