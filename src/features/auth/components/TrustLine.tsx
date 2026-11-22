import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { AppText } from '@/components/ui/Text';
import { colors, spacing } from '@/theme/tokens';

const SHIELD = { ios: 'checkmark.shield', android: 'verified_user', web: 'verified_user' } as const;

/** Website auth.tsx footer: a shield and "Verified credentials", under both the sign-in and the sign-up form. */
export function TrustLine({ testID }: { testID: string }) {
  return (
    <View testID={testID} style={styles.line}>
      <Icon testID={`${testID}.icon`} name={SHIELD} size={14} tintColor={colors.mutedForeground} />
      <AppText variant="caption" color="mutedForeground">
        Verified credentials
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing['1'] },
});
