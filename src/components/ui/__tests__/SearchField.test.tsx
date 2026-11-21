import { StyleSheet } from 'react-native';

import { colors, fonts, radius, shadows } from '@/theme/tokens';
import { fireEvent, renderWithProviders, screen } from '@/test/render';

import { SEARCH_ICONS, SearchField, withWebName } from '../SearchField';

const flat = (s: unknown) => StyleSheet.flatten(s as never) ?? {};

// D32: one 44-pt search field (Search, Saved, government and international job lists) and the same look as a fake,
// pressable bar on Home that opens the Search tab.
describe('SearchField (editable)', () => {
  it('is a 44-pt tonal field with the website placeholder, the font tokens and a search return key', async () => {
    await renderWithProviders(<SearchField testID="search.query" value="" onChangeText={() => {}} />);
    const input = screen.getByTestId('search.query');
    expect(input.props.placeholder).toBe('Role or specialty');
    expect(input.props.placeholderTextColor).toBe(colors.placeholder);
    expect(input.props.returnKeyType).toBe('search');
    expect(input.props.clearButtonMode).toBe('never');
    expect(input.props.maxFontSizeMultiplier).toBe(1.5);
    expect(input.props.accessibilityLabel).toBe('Search jobs');
    expect(flat(input.props.style)).toMatchObject({
      fontFamily: fonts.regular,
      fontSize: 15,
      color: colors.foreground,
    });
    const field = flat(screen.getByTestId('search.query.field').props.style);
    // Was surface2 (invisible on the canvas). R2 issue 2: the tonal `fill`.
    expect(field).toMatchObject({ minHeight: 44, backgroundColor: colors.fill, borderRadius: radius.md });
    expect(field.borderColor).toBe('transparent');
    expect(screen.getByTestId('search.query.icon')).toBeOnTheScreen();
  });

  it('passes typing and submit through, and uses a custom placeholder and label', async () => {
    const onChangeText = jest.fn();
    const onSubmit = jest.fn();
    await renderWithProviders(
      <SearchField
        testID="s"
        value=""
        onChangeText={onChangeText}
        onSubmit={onSubmit}
        placeholder="City or state"
        accessibilityLabel="Search by city"
      />,
    );
    const input = screen.getByTestId('s');
    expect(input.props.placeholder).toBe('City or state');
    expect(input.props.accessibilityLabel).toBe('Search by city');
    await fireEvent.changeText(input, 'nur');
    expect(onChangeText).toHaveBeenCalledWith('nur');
    await fireEvent(input, 'submitEditing');
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('shows a 1.5-pt brand ring while focused and drops it on blur', async () => {
    const onFocus = jest.fn();
    const onBlur = jest.fn();
    await renderWithProviders(
      <SearchField testID="s" value="" onChangeText={() => {}} onFocus={onFocus} onBlur={onBlur} />,
    );
    const input = screen.getByTestId('s');
    await fireEvent(input, 'focus');
    expect(onFocus).toHaveBeenCalled();
    expect(flat(screen.getByTestId('s.field').props.style)).toMatchObject({
      borderWidth: 1.5,
      borderColor: colors.ring,
    });
    await fireEvent(input, 'blur');
    expect(onBlur).toHaveBeenCalled();
    expect(flat(screen.getByTestId('s.field').props.style).borderColor).toBe('transparent');
  });

  it('shows the clear button only when there is text, and clearing empties the value', async () => {
    const onChangeText = jest.fn();
    const { rerender } = await renderWithProviders(
      <SearchField testID="s" value="" onChangeText={onChangeText} />,
    );
    expect(screen.queryByTestId('s.clear')).toBeNull();
    await rerender(<SearchField testID="s" value="nurse" onChangeText={onChangeText} />);
    const clear = screen.getByRole('button', { name: 'Clear search' });
    expect(clear).toBe(screen.getByTestId('s.clear'));
    expect(flat(clear.props.style)).toMatchObject({ width: 44, height: 44 });
    await fireEvent.press(clear);
    expect(onChangeText).toHaveBeenCalledWith('');
  });

  it('can autofocus', async () => {
    await renderWithProviders(<SearchField testID="s" value="" onChangeText={() => {}} autoFocus />);
    expect(screen.getByTestId('s').props.autoFocus).toBe(true);
  });
});

describe('SearchField (pressable)', () => {
  it('renders the same look as one search-role control that calls onPress, with no text input', async () => {
    const onPress = jest.fn();
    await renderWithProviders(<SearchField testID="home.search" onPress={onPress} />);
    const bar = screen.getByRole('search', { name: 'Search jobs' });
    expect(bar).toBe(screen.getByTestId('home.search'));
    expect(screen.getByText('Role or specialty')).toBeOnTheScreen();
    expect(flat(bar.props.style)).toMatchObject({
      minHeight: 44,
      // Was surface2 (invisible on the canvas). R2 issue 2: the tonal `fill`.
      backgroundColor: colors.fill,
      borderRadius: radius.md,
    });
    expect(screen.queryByTestId('home.search.clear')).toBeNull();
    await fireEvent.press(bar);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows the current value instead of the placeholder when given one', async () => {
    await renderWithProviders(<SearchField testID="home.search" onPress={() => {}} value="ICU nurse" />);
    expect(screen.getByText('ICU nurse')).toBeOnTheScreen();
    expect(screen.queryByText('Role or specialty')).toBeNull();
  });
  it('a city field can swap the magnifier for a location pin and use the next key', async () => {
    await renderWithProviders(
      <SearchField
        testID="search.city"
        value=""
        onChangeText={() => {}}
        placeholder="City or state"
        icon={{ ios: 'mappin.and.ellipse', android: 'location_on' }}
        returnKeyType="next"
      />,
    );
    expect(screen.getByTestId('search.city.icon')).toHaveProp('name', 'mappin.and.ellipse');
    expect(screen.getByTestId('search.city')).toHaveProp('returnKeyType', 'next');
  });
});

// R2 issue 2: on Home the search sits on the navy band, so it is elevated (white + soft shadow), not tonal.
describe('SearchField (elevated)', () => {
  it('pressable: white surface with the soft shadow', async () => {
    await renderWithProviders(<SearchField testID="home.search" elevated onPress={() => {}} />);
    expect(flat(screen.getByTestId('home.search').props.style)).toMatchObject({
      backgroundColor: colors.surface,
      boxShadow: shadows.soft,
    });
  });

  it('editable: white surface with the soft shadow', async () => {
    await renderWithProviders(<SearchField testID="s" elevated value="" onChangeText={() => {}} />);
    expect(flat(screen.getByTestId('s.field').props.style)).toMatchObject({
      backgroundColor: colors.surface,
      boxShadow: shadows.soft,
    });
  });
});

// Web draws Material Symbols by their web name; without one the magnifier was missing on Expo web.
// (Jest renders as iOS, so the names are checked on the constants the field uses.)
describe('SearchField icons on web', () => {
  it('the magnifier and the clear icon carry a web name', () => {
    expect(SEARCH_ICONS.magnifier).toMatchObject({ web: 'search' });
    expect(SEARCH_ICONS.clear).toMatchObject({ web: 'cancel' });
  });

  it('a caller icon without a web name (the city pin) gets its Android name on web', () => {
    expect(withWebName({ ios: 'mappin.and.ellipse', android: 'location_on' })).toEqual({
      ios: 'mappin.and.ellipse',
      android: 'location_on',
      web: 'location_on',
    });
  });
});
