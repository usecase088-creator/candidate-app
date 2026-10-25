import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme/tokens';

import { Button } from './Button';
import { AppText } from './Text';

export type EmptyStateProps = {
  testID: string;
  title: string;
  message?: string;
  action?: { label: string; onPress: () => void };
};

export function EmptyState({ testID, title, message, action }: EmptyStateProps) {
  return (
    <View testID={testID} style={styles.container}>
      <AppText variant="heading" align="center">
        {title}
      </AppText>
      {message ? (
        <AppText color="mutedForeground" align="center">
          {message}
        </AppText>
      ) : null}
      {action && (
        <Button
          testID={`${testID}.action`}
          label={action.label}
          variant="outline"
          fullWidth={false}
          onPress={action.onPress}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', gap: spacing['3'], padding: spacing['6'] },
});
