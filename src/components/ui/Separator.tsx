import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme/tokens';

export type SeparatorProps = {
  /** Left inset in points (the leading slot width + padding on a row). Default 0: full width. */
  inset?: number;
  testID?: string;
};

/** D32 hairline between rows and under headers. Decorative: hidden from screen readers. */
export function Separator({ inset = 0, testID }: SeparatorProps) {
  return (
    <View
      testID={testID}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.line, { marginLeft: inset }]}
    />
  );
}

const styles = StyleSheet.create({
  line: { height: StyleSheet.hairlineWidth, backgroundColor: colors.separator },
});
