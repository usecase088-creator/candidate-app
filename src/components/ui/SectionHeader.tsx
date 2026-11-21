import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme/tokens';

import { PressableScale } from './PressableScale';
import { AppText } from './Text';

export type SectionHeaderProps = {
  testID: string;
  title: string;
  /** Right-aligned muted count or note ("4 jobs"). */
  meta?: string;
  /** Text action on the right ("See all"). */
  action?: { label: string; onPress: () => void; testID: string };
};

/** D32 section header: 17/600 title, 24 above, 8 below. The heading variant gives it the header role. */
export function SectionHeader({ testID, title, meta, action }: SectionHeaderProps) {
  return (
    <View testID={testID} style={styles.row}>
      <AppText variant="heading" numberOfLines={2} style={styles.title}>
        {title}
      </AppText>
      {meta ? (
        <AppText testID={`${testID}.meta`} variant="secondary" color="mutedForeground" numberOfLines={1}>
          {meta}
        </AppText>
      ) : null}
      {action ? (
        <PressableScale
          testID={action.testID}
          accessibilityLabel={action.label}
          hitSlop={spacing['3']}
          pressScale={1}
          onPress={action.onPress}
        >
          <AppText testID={`${action.testID}.label`} variant="label" color="brand" numberOfLines={1}>
            {action.label}
          </AppText>
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['3'],
    paddingTop: spacing['6'],
    paddingBottom: spacing['2'],
    paddingHorizontal: spacing['4'],
  },
  title: { flex: 1 },
});
