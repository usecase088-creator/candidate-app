import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/Text';
import { spacing } from '@/theme/tokens';

/** Tab content until its phase builds the real screen. Tabs leave the bottom edge to the tab bar. */
export function PlaceholderScreen({
  testID,
  title,
  note,
  children,
}: {
  testID: string;
  title: string;
  note: string;
  children?: ReactNode;
}) {
  return (
    <Screen testID={testID} edges={['top']} scroll>
      <View style={styles.stack}>
        <AppText variant="title">{title}</AppText>
        <AppText color="mutedForeground">{note}</AppText>
        {children}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ stack: { gap: spacing['4'] } });
