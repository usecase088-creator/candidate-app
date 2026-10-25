import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme/tokens';

import { Button } from './Button';
import { AppText } from './Text';

export type ErrorStateProps = {
  testID: string;
  message: string;
  /** Website default: "Something went wrong". */
  title?: string;
  onRetry?: () => void;
  retrying?: boolean;
};

/** Website error screen: "Something went wrong" + message + "Try Again" (SCREENS.md, root layout). */
export function ErrorState({
  testID,
  message,
  title = 'Something went wrong',
  onRetry,
  retrying,
}: ErrorStateProps) {
  return (
    <View testID={testID} style={styles.container}>
      <AppText variant="heading" align="center">
        {title}
      </AppText>
      <AppText color="mutedForeground" align="center">
        {message}
      </AppText>
      {onRetry && (
        <Button
          testID={`${testID}.retry`}
          label="Try Again"
          variant="outline"
          fullWidth={false}
          loading={retrying}
          onPress={onRetry}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', gap: spacing['3'], padding: spacing['6'] },
});
