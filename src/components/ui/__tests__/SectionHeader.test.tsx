import { StyleSheet } from 'react-native';

import { colors, fonts, spacing } from '@/theme/tokens';
import { fireEvent, renderWithProviders, screen } from '@/test/render';

import { SectionHeader } from '../SectionHeader';

const flat = (s: unknown) => StyleSheet.flatten(s as never) ?? {};

// D32: section headers are 17/600 with 24 above and 8 below; meta and a text action sit on the right.
describe('SectionHeader', () => {
  it('is a header named after its title', async () => {
    await renderWithProviders(<SectionHeader testID="home.recommended" title="Recommended for you" />);
    const title = screen.getByRole('header', { name: 'Recommended for you' });
    expect(flat(title.props.style)).toMatchObject({ fontSize: 17, fontFamily: fonts.semibold });
    expect(screen.getByTestId('home.recommended')).toBeOnTheScreen();
    expect(screen.queryByTestId('home.recommended.meta')).toBeNull();
    expect(screen.queryByTestId('home.recommended.action')).toBeNull();
  });

  it('shows muted meta on the right', async () => {
    await renderWithProviders(<SectionHeader testID="h" title="Saved" meta="4 jobs" />);
    const meta = screen.getByTestId('h.meta');
    expect(meta).toHaveTextContent('4 jobs');
    expect(flat(meta.props.style)).toMatchObject({ fontSize: 13, color: colors.mutedForeground });
  });

  it('renders the action as a brand text button with its own testID and calls it', async () => {
    const onPress = jest.fn();
    await renderWithProviders(
      <SectionHeader
        testID="h"
        title="Recent"
        action={{ label: 'See all', onPress, testID: 'home.recent.seeAll' }}
      />,
    );
    const button = screen.getByRole('button', { name: 'See all' });
    expect(button).toHaveProp('testID', 'home.recent.seeAll');
    expect(button).toHaveProp('hitSlop', spacing['3']);
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(flat(screen.getByTestId('home.recent.seeAll.label').props.style)).toMatchObject({
      fontSize: 14,
      fontFamily: fonts.medium,
      color: colors.brand,
    });
  });

  it('has 24 above, 8 below and 16 at the sides, with no fixed height', async () => {
    await renderWithProviders(<SectionHeader testID="h" title="Filters" />);
    const style = flat(screen.getByTestId('h').props.style);
    expect(style).toMatchObject({
      paddingTop: spacing['6'],
      paddingBottom: spacing['2'],
      paddingHorizontal: spacing['4'],
      flexDirection: 'row',
    });
    expect(style.height).toBeUndefined();
  });
});
