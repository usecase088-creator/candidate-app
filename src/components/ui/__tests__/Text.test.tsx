import { StyleSheet } from 'react-native';

import { colors, fonts } from '@/theme/tokens';
import { renderWithProviders, screen } from '@/test/render';

import { AppText, type TextVariant } from '../Text';

const flat = (s: unknown) => StyleSheet.flatten(s as never) ?? {};

// D32 type ramp: few sizes, weight and colour carry the hierarchy, and every variant caps how far it grows with the
// phone's font size (the client saw "fonts very big in places" on Android).
const RAMP: Record<TextVariant, { fontSize: number; lineHeight: number; fontFamily: string; cap: number }> = {
  display: { fontSize: 28, lineHeight: 34, fontFamily: fonts.bold, cap: 1.4 },
  title: { fontSize: 22, lineHeight: 28, fontFamily: fonts.semibold, cap: 1.4 },
  heading: { fontSize: 17, lineHeight: 22, fontFamily: fonts.semibold, cap: 1.5 },
  rowTitle: { fontSize: 16, lineHeight: 22, fontFamily: fonts.semibold, cap: 1.5 },
  body: { fontSize: 15, lineHeight: 20, fontFamily: fonts.regular, cap: 2 },
  secondary: { fontSize: 13, lineHeight: 18, fontFamily: fonts.regular, cap: 2 },
  label: { fontSize: 14, lineHeight: 20, fontFamily: fonts.medium, cap: 1.3 },
  caption: { fontSize: 12, lineHeight: 16, fontFamily: fonts.medium, cap: 1.3 },
  button: { fontSize: 15, lineHeight: 20, fontFamily: fonts.semibold, cap: 1.3 },
};

describe('AppText ramp (D32)', () => {
  it.each(Object.entries(RAMP))('%s has its size, weight and font-scale cap', async (variant, want) => {
    await renderWithProviders(
      <AppText testID="t" variant={variant as TextVariant}>
        x
      </AppText>,
    );
    const el = screen.getByTestId('t');
    expect(flat(el.props.style)).toMatchObject({
      fontSize: want.fontSize,
      lineHeight: want.lineHeight,
      fontFamily: want.fontFamily,
      color: colors.foreground,
    });
    expect(el).toHaveProp('maxFontSizeMultiplier', want.cap);
  });

  it('defaults to body', async () => {
    await renderWithProviders(<AppText testID="t">x</AppText>);
    expect(flat(screen.getByTestId('t').props.style)).toMatchObject({ fontSize: 15, lineHeight: 20 });
  });

  it('tightens the tracking of display and title only', async () => {
    await renderWithProviders(
      <>
        <AppText testID="d" variant="display">
          x
        </AppText>
        <AppText testID="h" variant="heading">
          x
        </AppText>
      </>,
    );
    expect(flat(screen.getByTestId('d').props.style).letterSpacing).toBeLessThan(0);
    expect(flat(screen.getByTestId('h').props.style).letterSpacing).toBeUndefined();
  });

  it('display, title and heading are headers for screen readers; rows and body are not', async () => {
    await renderWithProviders(
      <>
        <AppText variant="title">Saved jobs</AppText>
        <AppText variant="rowTitle">Staff Nurse</AppText>
      </>,
    );
    expect(screen.getByRole('header', { name: 'Saved jobs' })).toBeOnTheScreen();
    expect(screen.queryByRole('header', { name: 'Staff Nurse' })).toBeNull();
  });

  it('tabular lines up digits (salary, counts, dates, OTP)', async () => {
    await renderWithProviders(
      <AppText testID="t" tabular>
        ₹3–4.5 LPA
      </AppText>,
    );
    expect(flat(screen.getByTestId('t').props.style).fontVariant).toEqual(['tabular-nums']);
  });

  it('a caller can still override the cap, the weight and the colour', async () => {
    await renderWithProviders(
      <AppText testID="t" variant="body" weight="bold" color="mutedForeground" maxFontSizeMultiplier={1.1}>
        x
      </AppText>,
    );
    const el = screen.getByTestId('t');
    expect(flat(el.props.style)).toMatchObject({ fontFamily: fonts.bold, color: colors.mutedForeground });
    expect(el).toHaveProp('maxFontSizeMultiplier', 1.1);
  });
});
