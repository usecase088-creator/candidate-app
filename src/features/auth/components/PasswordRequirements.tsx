import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { AppText } from '@/components/ui/Text';
import { colors, radius, spacing } from '@/theme/tokens';

/** Website wording (auth.tsx sign-up and auth_.forgot-password.tsx reset step). */
const REQUIREMENTS = [
  'At least 8 characters long',
  'At least one uppercase letter (A-Z)',
  'At least one lowercase letter (a-z)',
  'At least one special character (e.g. @, #, $, etc.)',
];

const DOT = { ios: 'circle.fill', android: 'circle', web: 'circle' } as const;
const DOT_SIZE = 6;

/** The "Password Requirements:" box under a new-password field. testIDs `{prefix}.requirements`, `{prefix}.requirement.{i}.icon`. */
export function PasswordRequirements({ testIDPrefix }: { testIDPrefix: string }) {
  return (
    <View testID={`${testIDPrefix}.requirements`} style={styles.requirements}>
      <AppText variant="secondary" weight="semibold">
        Password Requirements:
      </AppText>
      {REQUIREMENTS.map((r, i) => (
        <View key={r} style={styles.requirement}>
          <Icon
            testID={`${testIDPrefix}.requirement.${i}.icon`}
            name={DOT}
            size={DOT_SIZE}
            tintColor={colors.mutedForeground}
          />
          <AppText variant="secondary" color="mutedForeground" style={styles.flex}>
            {r}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  requirement: { flexDirection: 'row', alignItems: 'center', gap: spacing['2'] },
  flex: { flex: 1 },
  requirements: {
    gap: spacing['1'],
    padding: spacing['3'],
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
  },
});
