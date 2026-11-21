import type { ViewStyle } from 'react-native';

export type ListGroupStyle = {
  /** The box around the rows. */
  container: ViewStyle;
  /** Whether separators honour `separatorInset`; false = full width. */
  insetSeparators: boolean;
};

/** Android (D32): flat list, no container radius or border, separators edge to edge. */
export const listGroupStyle: ListGroupStyle = {
  container: {},
  insetSeparators: false,
};
