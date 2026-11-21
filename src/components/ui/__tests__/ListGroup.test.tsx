import { StyleSheet } from 'react-native';

import { colors, radius, spacing } from '@/theme/tokens';
import { renderWithProviders, screen } from '@/test/render';

import { ListGroup } from '../ListGroup';
import { ListRow } from '../ListRow';
import { listGroupStyle as androidStyle } from '../listGroupStyle.android';
import { listGroupStyle as iosStyle } from '../listGroupStyle.ios';

const flat = (s: unknown) => StyleSheet.flatten(s as never) ?? {};
// Separators are hidden from screen readers, so RNTL only finds them when asked to include hidden elements.
const HIDDEN = { includeHiddenElements: true };

function rows(n: number) {
  return Array.from({ length: n }, (_, i) => <ListRow key={i} testID={`r${i}`} title={`Row ${i}`} onPress={() => {}} />);
}

// D32: grouped lists. iOS = white rounded container with hairline separators inset 16; Android = flat, full width.
describe('ListGroup', () => {
  it('puts a separator between rows, none after the last', async () => {
    await renderWithProviders(<ListGroup testID="g">{rows(4)}</ListGroup>);
    expect(screen.getAllByTestId(/^g\.separator\./, HIDDEN)).toHaveLength(3);
    expect(screen.getByTestId('r3')).toBeOnTheScreen();
  });

  it('renders no separator for a single row and skips null children', async () => {
    await renderWithProviders(
      <ListGroup testID="g">
        {null}
        <ListRow testID="only" title="Only" />
        {false}
      </ListGroup>,
    );
    expect(screen.queryAllByTestId(/^g\.separator\./, HIDDEN)).toHaveLength(0);
    expect(screen.getByTestId('only')).toBeOnTheScreen();
  });

  it('renders the header as a section header and the footer as muted secondary text', async () => {
    await renderWithProviders(
      <ListGroup testID="g" header="Account" footer="Deleting removes your applications too.">
        {rows(1)}
      </ListGroup>,
    );
    expect(screen.getByRole('header', { name: 'Account' })).toBeOnTheScreen();
    expect(screen.getByTestId('g.header')).toBeOnTheScreen();
    const footer = screen.getByTestId('g.footer');
    expect(footer).toHaveTextContent('Deleting removes your applications too.');
    expect(flat(footer.props.style)).toMatchObject({ fontSize: 13, color: colors.mutedForeground });
  });

  it('renders neither header nor footer when not given', async () => {
    await renderWithProviders(<ListGroup testID="g">{rows(1)}</ListGroup>);
    expect(screen.queryByTestId('g.header')).toBeNull();
    expect(screen.queryByTestId('g.footer')).toBeNull();
  });

  describe('iOS', () => {
    it('is a white rounded container with a hairline border, inset by the screen margin', () => {
      expect(iosStyle.container).toMatchObject({
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.separator,
        marginHorizontal: spacing['4'],
        overflow: 'hidden',
      });
      expect(iosStyle.insetSeparators).toBe(true);
    });

    it('insets separators 16 by default and by separatorInset when given (Jest resolves .ios)', async () => {
      await renderWithProviders(
        <>
          <ListGroup testID="a">{rows(2)}</ListGroup>
          <ListGroup testID="b" separatorInset={56}>
            {rows(2)}
          </ListGroup>
        </>,
      );
      expect(flat(screen.getByTestId('a.separator.0', HIDDEN).props.style)).toMatchObject({ marginLeft: spacing['4'] });
      expect(flat(screen.getByTestId('b.separator.0', HIDDEN).props.style)).toMatchObject({ marginLeft: 56 });
      expect(flat(screen.getByTestId('a.list').props.style)).toMatchObject({ borderRadius: radius.md });
    });
  });

  describe('Android', () => {
    it('is flat: no radius, border or margin, and separators run full width', () => {
      expect(androidStyle.container.borderRadius).toBeUndefined();
      expect(androidStyle.container.borderWidth).toBeUndefined();
      expect(androidStyle.container.marginHorizontal).toBeUndefined();
      expect(androidStyle.insetSeparators).toBe(false);
    });
  });
});
