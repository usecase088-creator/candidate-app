import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme/tokens';

import { listGroupStyle } from './listGroupStyle';
import { SectionHeader } from './SectionHeader';
import { Separator } from './Separator';
import { AppText } from './Text';

export type ListGroupProps = {
  testID: string;
  /** Rendered as a SectionHeader above the rows. */
  header?: string;
  /** Muted secondary text below the rows. */
  footer?: string;
  /** Left inset of the separators (iOS only): 16, or the leading slot width + 16. */
  separatorInset?: number;
  children: ReactNode;
};

/**
 * D32 grouped list. iOS: white container, radius 12, hairline border, separators inset. Android: flat, separators full
 * width. The platform look lives in listGroupStyle.ios.ts / .android.ts.
 */
export function ListGroup({
  testID,
  header,
  footer,
  separatorInset = spacing['4'],
  children,
}: ListGroupProps) {
  const rows = Children.toArray(children).filter(isValidElement);
  const inset = listGroupStyle.insetSeparators ? separatorInset : 0;
  return (
    <View testID={testID}>
      {header ? <SectionHeader testID={`${testID}.header`} title={header} /> : null}
      <View testID={`${testID}.list`} style={listGroupStyle.container}>
        {rows.map((row, i) => (
          <Fragment key={row.key ?? i}>
            {i > 0 ? <Separator testID={`${testID}.separator.${i - 1}`} inset={inset} /> : null}
            {row}
          </Fragment>
        ))}
      </View>
      {footer ? (
        <AppText
          testID={`${testID}.footer`}
          variant="secondary"
          color="mutedForeground"
          style={styles.footer}
        >
          {footer}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { paddingHorizontal: spacing['4'], paddingTop: spacing['2'] },
});
