import { StyleSheet } from 'react-native';

import { colors, fonts, radius } from '@/theme/tokens';
import { fireEvent, renderWithProviders, screen } from '@/test/render';

import { Avatar } from '../Avatar';

const flat = (s: unknown) => StyleSheet.flatten(s as never) ?? {};

describe('Avatar', () => {
  it('shows initials on brandSoft with brand text, 56 pt and circular by default', async () => {
    await renderWithProviders(<Avatar testID="av" name="Rajendra Kumar" />);
    const wrap = screen.getByTestId('av');
    const initials = screen.getByTestId('av.initials');
    expect(initials).toHaveTextContent('RK');
    expect(flat(wrap.props.style)).toMatchObject({
      width: 56,
      height: 56,
      borderRadius: radius.full,
      backgroundColor: colors.brandSoft,
    });
    expect(flat(initials.props.style)).toMatchObject({
      color: colors.brand,
      fontSize: 16,
      fontFamily: fonts.semibold,
    });
    expect(screen.queryByTestId('av.image')).toBeNull();
  });

  it.each([
    [40, 14],
    [56, 16],
    [88, 22],
  ])('size %i uses a %i-pt initial', async (size, fontSize) => {
    await renderWithProviders(<Avatar testID="av" name="Asha" size={size as 40 | 56 | 88} />);
    expect(flat(screen.getByTestId('av').props.style)).toMatchObject({ width: size, height: size });
    expect(flat(screen.getByTestId('av.initials').props.style)).toMatchObject({ fontSize });
  });

  it('caps the initials at 1.2x font scale', async () => {
    await renderWithProviders(<Avatar testID="av" name="Asha" />);
    expect(screen.getByTestId('av.initials')).toHaveProp('maxFontSizeMultiplier', 1.2);
    expect(screen.getByTestId('av.initials')).toHaveProp('numberOfLines', 1);
  });

  it('is an image for a screen reader: initials when there is no photo', async () => {
    await renderWithProviders(<Avatar testID="av" name="Asha" />);
    expect(screen.getByTestId('av')).toHaveProp('accessibilityRole', 'image');
    expect(screen.getByTestId('av')).toHaveProp('accessibilityLabel', 'Asha initials');
  });

  it('with a uri, shows the photo over the initials and says whose photo it is', async () => {
    await renderWithProviders(<Avatar testID="av" name="Asha" uri="https://cdn.example/a.jpg" />);
    const image = screen.getByTestId('av.image');
    expect(image).toHaveProp('source', [{ uri: 'https://cdn.example/a.jpg' }]);
    expect(image).toHaveProp('contentFit', 'cover');
    expect(image).toHaveProp('transition', { duration: 150 });
    expect(image).toHaveProp('cachePolicy', 'memory-disk');
    expect(flat(image.props.style)).toMatchObject({ position: 'absolute', borderRadius: radius.full });
    expect(screen.getByTestId('av')).toHaveProp('accessibilityLabel', "Asha's photo");
    expect(screen.getByTestId('av.initials')).toHaveTextContent('A');
  });

  it('goes back to the initials when the photo fails to load', async () => {
    await renderWithProviders(<Avatar testID="av" name="Asha" uri="https://cdn.example/broken.jpg" />);
    await fireEvent(screen.getByTestId('av.image'), 'error', { nativeEvent: { error: 'x' } });
    expect(screen.queryByTestId('av.image')).toBeNull();
    expect(screen.getByTestId('av')).toHaveProp('accessibilityLabel', 'Asha initials');
  });

  it('draws a 2-pt brand ring only when asked', async () => {
    await renderWithProviders(
      <>
        <Avatar testID="plain" name="Asha" />
        <Avatar testID="ringed" name="Asha" ring />
      </>,
    );
    expect(screen.queryByTestId('plain.ring')).toBeNull();
    expect(flat(screen.getByTestId('ringed.ring').props.style)).toMatchObject({
      borderWidth: 2,
      borderColor: colors.brand,
      borderRadius: radius.full,
    });
  });
});
