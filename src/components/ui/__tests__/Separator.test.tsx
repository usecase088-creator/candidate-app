import { StyleSheet } from 'react-native';

import { colors } from '@/theme/tokens';
import { renderWithProviders, screen } from '@/test/render';

import { Separator } from '../Separator';

const flat = (s: unknown) => StyleSheet.flatten(s as never) ?? {};
// Separators are hidden from screen readers, so RNTL only finds them when asked to include hidden elements.
const HIDDEN = { includeHiddenElements: true };

// D32: hairline `separator` between rows and under headers; no 1 px dark borders.
describe('Separator', () => {
  it('is a hairline in the separator colour with no inset by default', async () => {
    await renderWithProviders(<Separator testID="sep" />);
    expect(flat(screen.getByTestId('sep', HIDDEN).props.style)).toMatchObject({
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.separator,
      marginLeft: 0,
    });
  });

  it('takes a left inset (leading slot width + padding)', async () => {
    await renderWithProviders(<Separator testID="sep" inset={56} />);
    expect(flat(screen.getByTestId('sep', HIDDEN).props.style)).toMatchObject({ marginLeft: 56 });
  });

  it('is invisible to screen readers', async () => {
    await renderWithProviders(<Separator testID="sep" />);
    expect(screen.getByTestId('sep', HIDDEN)).toHaveProp('accessibilityElementsHidden', true);
    expect(screen.getByTestId('sep', HIDDEN)).toHaveProp('importantForAccessibility', 'no-hide-descendants');
  });
});
