import { onlineManager } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme/tokens';

import { AppText } from './Text';

// The website has no offline state; app wording (PLAN.md: "clear offline banner, no silent failures").
export const OFFLINE_MESSAGE = "You're offline. Showing saved information where possible.";

const subscribe = (onChange: () => void) => onlineManager.subscribe(onChange);
const isOnline = () => onlineManager.isOnline();

/** Follows TanStack's onlineManager, which src/lib/queryClient.ts feeds from expo-network. */
export function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, isOnline, isOnline);
  if (online) return null;
  return (
    <View
      testID="offline.banner"
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={styles.banner}
    >
      <AppText variant="caption" weight="medium" color="primaryForeground" align="center">
        {OFFLINE_MESSAGE}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { backgroundColor: colors.primary, paddingVertical: spacing['2'], paddingHorizontal: spacing['4'] },
});
