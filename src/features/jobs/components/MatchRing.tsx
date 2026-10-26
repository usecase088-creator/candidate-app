import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/Text';
import { colors } from '@/theme/tokens';

/**
 * Match score. The website draws a progress ring; the app shows the same number in a ring-shaped badge (no vector
 * library needed). The ring colour gets stronger with the score.
 */
export function MatchRing({ value, size = 44, testID }: { value: number; size?: number; testID?: string }) {
  const strong = value >= 80;
  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={`${value}% match`}
      style={[
        styles.ring,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: strong ? colors.brand : colors.border,
          borderWidth: strong ? 4 : 3,
        },
      ]}
    >
      <AppText variant="caption" weight="semibold" color="primary" style={styles.text}>
        {value}%
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  // Stays inside the ring at font scale 2.0.
  text: { fontSize: 10, lineHeight: 12 },
});
