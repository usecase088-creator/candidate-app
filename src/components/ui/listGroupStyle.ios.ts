import { StyleSheet } from 'react-native';

import { colors, radius, spacing } from '@/theme/tokens';

import type { ListGroupStyle } from './listGroupStyle.android';

export type { ListGroupStyle };

/** iOS (D32): inset grouped list, white card with radius 12 and a hairline border, separators inset 16. */
export const listGroupStyle: ListGroupStyle = {
  container: {
    marginHorizontal: spacing['4'],
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.separator,
    overflow: 'hidden',
  },
  insetSeparators: true,
};
