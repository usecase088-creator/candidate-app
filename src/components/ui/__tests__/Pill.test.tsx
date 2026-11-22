import { StyleSheet } from 'react-native';

import { colors, radius } from '@/theme/tokens';
import { renderWithProviders, screen } from '@/test/render';

import { Pill, type PillTone, pillTones } from '../Pill';

const flat = (s: unknown) => StyleSheet.flatten(s as never) ?? {};

// D32: a 22-pt status pill with one `tone` from the semantic roles (docs/design/UI-REDESIGN.md section 2).
const TONES: Record<PillTone, { bg: string; fg: string }> = {
  neutral: { bg: colors.muted, fg: colors.mutedForeground },
  info: { bg: colors.skySoft, fg: colors.skyText },
  success: { bg: colors.successSoft, fg: colors.successText },
  warning: { bg: colors.amberSoft, fg: colors.amberText },
  error: { bg: colors.destructiveSoft, fg: colors.errorText },
  // R3 a11y P2-2: brandText (5.3:1 on brandSoft); brand was 4.31.
  brand: { bg: colors.brandSoft, fg: colors.brandText },
};

describe('Pill', () => {
  it.each(Object.entries(TONES))('%s tone fills and colours from its token pair', async (tone, want) => {
    await renderWithProviders(<Pill testID="p" label="Shortlisted" tone={tone as PillTone} />);
    expect(flat(screen.getByTestId('p').props.style)).toMatchObject({ backgroundColor: want.bg });
    expect(flat(screen.getByTestId('p.label').props.style)).toMatchObject({ color: want.fg });
    expect(colors[pillTones[tone as PillTone].bg]).toBe(want.bg);
    expect(colors[pillTones[tone as PillTone].fg]).toBe(want.fg);
  });

  it('is 22 pt, fully rounded, 8 pt side padding and has no border', async () => {
    await renderWithProviders(<Pill testID="p" label="Verified" tone="brand" />);
    const style = flat(screen.getByTestId('p').props.style);
    expect(style).toMatchObject({ minHeight: 22, borderRadius: radius.full, paddingHorizontal: 8 });
    expect(style.borderWidth).toBeUndefined();
  });

  it('uses the caption ramp (12/16, medium) capped at 1.3x font scale', async () => {
    await renderWithProviders(<Pill testID="p" label="Verified" tone="brand" />);
    const label = screen.getByTestId('p.label');
    expect(flat(label.props.style)).toMatchObject({ fontSize: 12, lineHeight: 16 });
    expect(label).toHaveProp('maxFontSizeMultiplier', 1.3);
  });

  it('reads as plain text to a screen reader, with the label as its name', async () => {
    await renderWithProviders(<Pill testID="p" label="Under review" tone="warning" />);
    const pill = screen.getByTestId('p');
    expect(pill).toHaveProp('accessibilityRole', 'text');
    expect(pill).toHaveProp('accessibilityLabel', 'Under review');
    expect(screen.getByText('Under review')).toBeOnTheScreen();
  });

  it('draws an optional 12-pt leading icon in the tone colour', async () => {
    await renderWithProviders(
      <Pill
        testID="p"
        label="Verified"
        tone="brand"
        icon={{ ios: 'checkmark.seal.fill', android: 'verified', web: 'verified' }}
      />,
    );
    const icon = screen.getByTestId('p.icon');
    expect(icon).toHaveProp('tintColor', colors.brandText);
    expect(flat(icon.props.style)).toMatchObject({ width: 12, height: 12 });
  });

  it('has no icon element when none is given', async () => {
    await renderWithProviders(<Pill testID="p" label="Verified" tone="brand" />);
    expect(screen.queryByTestId('p.icon')).toBeNull();
  });

  it('lines up digits when tabular (match %, counts)', async () => {
    await renderWithProviders(<Pill testID="p" label="92% match" tone="brand" tabular />);
    expect(flat(screen.getByTestId('p.label').props.style).fontVariant).toEqual(['tabular-nums']);
  });
});
