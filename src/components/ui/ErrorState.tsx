import type { SymbolViewProps } from 'expo-symbols';
import { View } from 'react-native';

import { colors } from '@/theme/tokens';

import { Button } from './Button';
import { stateStyles as styles } from './EmptyState';
import { Icon } from './Icon';
import { AppText } from './Text';

export type ErrorStateProps = {
  testID: string;
  message: string;
  /** Website default: "Something went wrong". */
  title?: string;
  onRetry?: () => void;
  retrying?: boolean;
  /** 28-pt icon in the destructiveSoft circle. Default: a warning triangle. Offline callers pass their own. */
  icon?: SymbolViewProps['name'];
};

const DEFAULT_ICON: SymbolViewProps['name'] = {
  ios: 'exclamationmark.triangle',
  android: 'warning',
  web: 'warning',
};
const ICON_SIZE = 28;

/** Website error screen: "Something went wrong" + message + "Try Again" (SCREENS.md, root layout). D32 look. */
export function ErrorState({
  testID,
  message,
  title = 'Something went wrong',
  onRetry,
  retrying,
  icon = DEFAULT_ICON,
}: ErrorStateProps) {
  return (
    <View testID={testID} style={styles.container}>
      <View
        testID={`${testID}.iconCircle`}
        style={[styles.circle, { backgroundColor: colors.destructiveSoft }]}
      >
        <Icon testID={`${testID}.icon`} name={icon} size={ICON_SIZE} tintColor={colors.errorText} />
      </View>
      <AppText variant="heading" align="center">
        {title}
      </AppText>
      <AppText color="mutedForeground" align="center" style={styles.message}>
        {message}
      </AppText>
      {onRetry && (
        <Button
          testID={`${testID}.retry`}
          label="Try Again"
          variant="secondary"
          size="md"
          fullWidth={false}
          loading={retrying}
          onPress={onRetry}
        />
      )}
    </View>
  );
}
