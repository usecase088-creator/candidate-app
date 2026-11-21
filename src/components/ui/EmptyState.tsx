import type { SymbolViewProps } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/theme/tokens';

import { Button } from './Button';
import { Icon } from './Icon';
import { AppText } from './Text';

export type EmptyStateProps = {
  testID: string;
  title: string;
  message?: string;
  action?: { label: string; onPress: () => void };
  /** 28-pt icon in the brandSoft circle. Default: an empty tray. */
  icon?: SymbolViewProps['name'];
};

const DEFAULT_ICON: SymbolViewProps['name'] = { ios: 'tray', android: 'inbox', web: 'inbox' };
const ICON_SIZE = 28;

/** D32 empty state: tinted icon circle, 17-pt title, one sentence, one self-sized tonal action. */
export function EmptyState({ testID, title, message, action, icon = DEFAULT_ICON }: EmptyStateProps) {
  return (
    <View testID={testID} style={stateStyles.container}>
      <View
        testID={`${testID}.iconCircle`}
        style={[stateStyles.circle, { backgroundColor: colors.brandSoft }]}
      >
        <Icon testID={`${testID}.icon`} name={icon} size={ICON_SIZE} tintColor={colors.brand} />
      </View>
      <AppText variant="heading" align="center">
        {title}
      </AppText>
      {message ? (
        <AppText color="mutedForeground" align="center" style={stateStyles.message}>
          {message}
        </AppText>
      ) : null}
      {action && (
        <Button
          testID={`${testID}.action`}
          label={action.label}
          variant="secondary"
          size="md"
          fullWidth={false}
          align="center"
          onPress={action.onPress}
        />
      )}
    </View>
  );
}

/** Shared by ErrorState so both states lay out the same. */
export const stateStyles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing['3'],
    paddingVertical: spacing['8'],
    paddingHorizontal: spacing['6'],
  },
  circle: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: { maxWidth: 320 },
});
