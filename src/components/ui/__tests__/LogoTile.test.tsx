import { StyleSheet } from 'react-native';

import { colors, logoTints, radius } from '@/theme/tokens';
import { fireEvent, renderWithProviders, screen } from '@/test/render';

import { initialsOf, LogoTile, tintFor } from '../LogoTile';

const flat = (s: unknown) => StyleSheet.flatten(s as never) ?? {};
const NAME = 'Seed City Multispeciality Hospital';

describe('initialsOf', () => {
  it.each([
    [NAME, 'SC'],
    ['Apollo', 'A'],
    ['', ''],
    ['   ', ''],
    ['seed city', 'SC'],
    ['  Seed   City  ', 'SC'],
    ['Ärzte ohne Grenzen', 'ÄO'],
    ['больница Москва', 'БМ'],
    ['आर्य हॉस्पिटल', 'आह'],
  ])('%j -> %j', (name, want) => {
    expect(initialsOf(name)).toBe(want);
  });
});

describe('tintFor', () => {
  it('is deterministic: the same name always gets the same tint', () => {
    expect(tintFor(NAME)).toBe(tintFor(NAME));
    expect(tintFor('Apollo')).toBe(tintFor('Apollo'));
  });

  it('always picks one of the six logo tints', () => {
    for (const n of [NAME, 'Apollo', 'Fortis', 'Max', '', 'больница', 'आर्य']) {
      expect(logoTints).toContain(tintFor(n));
    }
  });

  it('spreads different names over more than one tint', () => {
    const names = ['Apollo', 'Fortis', 'Max Healthcare', 'Manipal', 'Narayana', 'Medanta', 'AIIMS', 'Seed City'];
    expect(new Set(names.map((n) => tintFor(n).bg)).size).toBeGreaterThan(1);
  });
});

describe('LogoTile', () => {
  it('shows the initials on the deterministic tint when there is no logo', async () => {
    await renderWithProviders(<LogoTile testID="logo" name={NAME} />);
    const tile = screen.getByTestId('logo');
    const initials = screen.getByTestId('logo.initials');
    expect(initials).toHaveTextContent('SC');
    expect(flat(tile.props.style)).toMatchObject({
      width: 40,
      height: 40,
      borderRadius: radius.sm,
      backgroundColor: tintFor(NAME).bg,
    });
    expect(flat(initials.props.style)).toMatchObject({ color: tintFor(NAME).fg, fontSize: 14 });
    expect(screen.queryByTestId('logo.image')).toBeNull();
  });

  it('same name renders the same tint twice; a null uri is the same as none', async () => {
    await renderWithProviders(
      <>
        <LogoTile testID="a" name={NAME} />
        <LogoTile testID="b" name={NAME} uri={null} />
      </>,
    );
    expect(flat(screen.getByTestId('a').props.style).backgroundColor).toBe(
      flat(screen.getByTestId('b').props.style).backgroundColor,
    );
    expect(screen.queryByTestId('b.image')).toBeNull();
  });

  it('48 and 56 use the row-title size and the md radius', async () => {
    await renderWithProviders(
      <>
        <LogoTile testID="m" name={NAME} size={48} />
        <LogoTile testID="l" name={NAME} size={56} />
      </>,
    );
    expect(flat(screen.getByTestId('m').props.style)).toMatchObject({ width: 48, borderRadius: radius.md });
    expect(flat(screen.getByTestId('l').props.style)).toMatchObject({ width: 56, borderRadius: radius.md });
    expect(flat(screen.getByTestId('m.initials').props.style)).toMatchObject({ fontSize: 16 });
    expect(flat(screen.getByTestId('l.initials').props.style)).toMatchObject({ fontSize: 16 });
  });

  it('caps the initials at 1.2x font scale so the tile never overflows', async () => {
    await renderWithProviders(<LogoTile testID="logo" name={NAME} />);
    expect(screen.getByTestId('logo.initials')).toHaveProp('maxFontSizeMultiplier', 1.2);
    expect(screen.getByTestId('logo.initials')).toHaveProp('numberOfLines', 1);
  });

  it('is one image for a screen reader, named after the hospital', async () => {
    await renderWithProviders(<LogoTile testID="logo" name={NAME} />);
    const tile = screen.getByTestId('logo');
    expect(tile).toHaveProp('accessibilityRole', 'image');
    expect(tile).toHaveProp('accessibilityLabel', `${NAME} logo`);
  });

  it('with a uri, draws the cached image over the initials with a hairline ring', async () => {
    await renderWithProviders(<LogoTile testID="logo" name={NAME} uri="https://cdn.example/logo.png" />);
    const image = screen.getByTestId('logo.image');
    expect(image).toHaveProp('source', [{ uri: 'https://cdn.example/logo.png' }]);
    expect(image).toHaveProp('contentFit', 'contain');
    expect(image).toHaveProp('transition', { duration: 150 });
    expect(image).toHaveProp('cachePolicy', 'memory-disk');
    expect(flat(image.props.style)).toMatchObject({ position: 'absolute', backgroundColor: colors.surface });
    expect(flat(screen.getByTestId('logo.ring').props.style)).toMatchObject({
      borderColor: colors.separator,
      borderWidth: StyleSheet.hairlineWidth,
    });
    // The initials stay underneath so something shows until the image arrives.
    expect(screen.getByTestId('logo.initials')).toHaveTextContent('SC');
  });

  it('hides the image and keeps the initials when the image fails to load', async () => {
    await renderWithProviders(<LogoTile testID="logo" name={NAME} uri="https://cdn.example/broken.png" />);
    fireEvent(screen.getByTestId('logo.image'), 'error', { nativeEvent: { error: 'not found' } });
    expect(screen.queryByTestId('logo.image')).toBeNull();
    expect(screen.queryByTestId('logo.ring')).toBeNull();
    expect(screen.getByTestId('logo.initials')).toHaveTextContent('SC');
  });

  it('tries again when the uri changes after a failure', async () => {
    const { rerender } = await renderWithProviders(
      <LogoTile testID="logo" name={NAME} uri="https://cdn.example/broken.png" />,
    );
    fireEvent(screen.getByTestId('logo.image'), 'error', { nativeEvent: { error: 'not found' } });
    expect(screen.queryByTestId('logo.image')).toBeNull();
    rerender(<LogoTile testID="logo" name={NAME} uri="https://cdn.example/fixed.png" />);
    expect(screen.getByTestId('logo.image')).toHaveProp('source', [{ uri: 'https://cdn.example/fixed.png' }]);
  });

  it('falls back to a generic label for an empty name', async () => {
    await renderWithProviders(<LogoTile testID="logo" name="" />);
    expect(screen.getByTestId('logo')).toHaveProp('accessibilityLabel', 'Hospital logo');
  });
});
