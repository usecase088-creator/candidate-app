// D32 signature touch: the match score as an SVG ring (brand arc on a brandSoft track) that fills from 0 on mount.
import { StyleSheet } from 'react-native';

import { renderWithProviders, screen } from '@/test/render';

import { arcOffset, MatchRing } from '../MatchRing';

const flat = (s: unknown) => StyleSheet.flatten(s as never) ?? {};

describe('MatchRing', () => {
  it('is one element for screen readers: "{n}% match", with the value as a progress', async () => {
    await renderWithProviders(<MatchRing testID="m" value={82} />);
    const ring = screen.getByTestId('m');
    expect(ring.props.accessibilityLabel).toBe('82% match');
    expect(ring.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 82 });
    expect(screen.getByText('82%')).toBeOnTheScreen();
  });

  it('is 44 pt by default and takes a smaller size for rail cards', async () => {
    await renderWithProviders(<MatchRing testID="m" value={60} />);
    expect(flat(screen.getByTestId('m').props.style).width).toBe(44);
    await renderWithProviders(<MatchRing testID="s" value={60} size={36} />);
    expect(flat(screen.getByTestId('s').props.style).height).toBe(36);
    // R3 #13 / a11y P3-15: the small ring's text is the theme's 2xs size (11 pt), not a loose 10.
    expect(flat(screen.getByText('60%', { exact: true }).props.style)).toMatchObject({ fontSize: 11 });
  });

  it('keeps the value in 0..100 and rounds it', async () => {
    await renderWithProviders(<MatchRing testID="m" value={140.4} />);
    expect(screen.getByTestId('m').props.accessibilityLabel).toBe('100% match');
  });

  it("starts at 12 o'clock with a View transform (the SVG rotation prop breaks on web)", async () => {
    await renderWithProviders(<MatchRing testID="m" value={50} />);
    expect(flat(screen.getByTestId('m.rotor').props.style).transform).toEqual([{ rotate: '-90deg' }]);
    expect(screen.getByTestId('m.arc')).toBeOnTheScreen();
  });

  it('arcOffset: a full circle of dash for 0, none for 100', () => {
    expect(arcOffset(0, 100)).toBe(100);
    expect(arcOffset(25, 100)).toBe(75);
    expect(arcOffset(100, 100)).toBe(0);
  });
});
