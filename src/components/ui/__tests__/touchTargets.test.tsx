import { StyleSheet } from 'react-native';

import { CategoryChips } from '@/features/jobs/components/CategoryChips';
import { ExternalLinkButton } from '@/features/jobs/components/listings/ListingParts';
import { renderWithProviders, screen } from '@/test/render';

import { CHIP_SLOP } from '../Chip';
import { PasswordInput } from '../PasswordInput';
import { SearchField } from '../SearchField';
import { SectionHeader } from '../SectionHeader';

const slop = (v: unknown) => (typeof v === 'number' ? v : ((v as { top?: number } | undefined)?.top ?? 0));
const flat = (s: unknown) => StyleSheet.flatten(s as never) ?? {};

// R3 a11y P2-9: every icon button and text action reaches 48 (Android 48 dp; more than iOS 44 pt) without growing.
describe('touch targets reach 48', () => {
  it('the password eye (44 drawn)', async () => {
    await renderWithProviders(<PasswordInput testID="p" label="Password" />);
    expect(44 + 2 * slop(screen.getByTestId('p.toggle').props.hitSlop)).toBeGreaterThanOrEqual(48);
  });

  it('the search clear button (44 drawn)', async () => {
    await renderWithProviders(<SearchField testID="s" value="nurse" onChangeText={() => {}} />);
    expect(44 + 2 * slop(screen.getByTestId('s.clear').props.hitSlop)).toBeGreaterThanOrEqual(48);
  });

  it('the external link button (44 drawn)', async () => {
    await renderWithProviders(<ExternalLinkButton testID="x" accessibilityLabel="Open" onPress={() => {}} />);
    expect(44 + 2 * slop(screen.getByTestId('x').props.hitSlop)).toBeGreaterThanOrEqual(48);
  });

  it('a section header action (a 20-pt text line)', async () => {
    await renderWithProviders(
      <SectionHeader
        testID="h"
        title="Jobs"
        action={{ testID: 'h.all', label: 'See all', onPress: () => {} }}
      />,
    );
    expect(20 + 2 * slop(screen.getByTestId('h.all').props.hitSlop)).toBeGreaterThanOrEqual(48);
  });

  it('the category chip rail pads enough for the chip slop (Android clips touches outside the parent)', async () => {
    await renderWithProviders(<CategoryChips categories={['Nursing']} active={null} onChange={() => {}} />);
    const rail = screen.getByTestId('categories.rail');
    expect(flat(rail.props.contentContainerStyle).paddingVertical).toBeGreaterThanOrEqual(CHIP_SLOP);
  });
});
