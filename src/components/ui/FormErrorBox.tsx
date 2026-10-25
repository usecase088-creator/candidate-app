import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/theme/tokens';

import { AppText } from './Text';

/** The website's red box at the top of auth forms (first validation error or the server error). */
export function FormErrorBox({ testID, message }: { testID: string; message: string | undefined }) {
  if (!message) return null;
  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={styles.box}
    >
      <AppText variant="body" weight="medium" color="errorText">
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderColor: colors.destructive,
    backgroundColor: colors.destructiveSoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing['3'],
    paddingVertical: spacing['2'],
  },
});
