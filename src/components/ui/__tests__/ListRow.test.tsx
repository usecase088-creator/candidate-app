import { StyleSheet, Text, View } from 'react-native';

import { haptic } from '@/lib/haptics';
import { colors, fonts, spacing } from '@/theme/tokens';
import { fireEvent, renderWithProviders, screen } from '@/test/render';

import { ListRow } from '../ListRow';

jest.mock('@/lib/haptics', () => ({ haptic: jest.fn() }));

const flat = (s: unknown) => StyleSheet.flatten(s as never) ?? {};
afterEach(() => jest.clearAllMocks());

// D32 settings-style row: 52-72 pt, leading slot, title + optional subtitle, value / chevron on the right.
describe('ListRow', () => {
  it('is a button named after its title when pressable, and calls onPress', async () => {
    const onPress = jest.fn();
    await renderWithProviders(<ListRow testID="settings.profile" title="Edit profile" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Edit profile' }));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('settings.profile')).toBeOnTheScreen();
  });

  it('adds the value to its accessible name, and prefers an explicit accessibilityLabel', async () => {
    await renderWithProviders(
      <>
        <ListRow testID="a" title="Language" value="English" onPress={() => {}} />
        <ListRow
          testID="b"
          title="Mobile"
          value="+91"
          accessibilityLabel="Mobile number, verified"
          onPress={() => {}}
        />
      </>,
    );
    expect(screen.getByRole('button', { name: 'Language, English' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Mobile number, verified' })).toBeOnTheScreen();
  });

  it('shows the value right of the title in muted text', async () => {
    await renderWithProviders(<ListRow testID="a" title="Language" value="English" onPress={() => {}} />);
    const value = screen.getByTestId('a.value');
    expect(value).toHaveTextContent('English');
    expect(flat(value.props.style)).toMatchObject({ color: colors.mutedForeground });
  });

  it('shows a chevron by default when pressable and none when static', async () => {
    await renderWithProviders(
      <>
        <ListRow testID="a" title="Pressable" onPress={() => {}} />
        <ListRow testID="b" title="Static" />
      </>,
    );
    expect(screen.getByTestId('a.chevron')).toBeOnTheScreen();
    expect(screen.queryByTestId('b.chevron')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Static' })).toBeNull();
    expect(screen.getByTestId('b')).toHaveTextContent('Static');
  });

  it('hides the chevron with trailing="none" and renders a custom trailing node', async () => {
    await renderWithProviders(
      <>
        <ListRow testID="a" title="No chevron" trailing="none" onPress={() => {}} />
        <ListRow
          testID="b"
          title="Custom"
          trailing={<Text testID="b.switch">switch</Text>}
          onPress={() => {}}
        />
      </>,
    );
    expect(screen.queryByTestId('a.chevron')).toBeNull();
    expect(screen.queryByTestId('b.chevron')).toBeNull();
    expect(screen.getByTestId('b.switch')).toBeOnTheScreen();
  });

  it('renders the leading slot and the subtitle', async () => {
    await renderWithProviders(
      <ListRow
        testID="a"
        title="Notifications"
        subtitle="Job alerts and application updates"
        leading={<View testID="a.icon" />}
        onPress={() => {}}
      />,
    );
    expect(screen.getByTestId('a.icon')).toBeOnTheScreen();
    const subtitle = screen.getByTestId('a.subtitle');
    expect(subtitle).toHaveTextContent('Job alerts and application updates');
    expect(subtitle).toHaveProp('numberOfLines', 2);
    expect(flat(subtitle.props.style)).toMatchObject({ fontSize: 13, color: colors.mutedForeground });
  });

  it('title is body 15/500 on up to two lines by default (R3 a11y: one line cut titles at large text), rowTitle 16/600 on request', async () => {
    await renderWithProviders(
      <>
        <ListRow testID="a" title="Settings row" />
        <ListRow testID="b" title="Card row" titleVariant="rowTitle" />
      </>,
    );
    const a = screen.getByTestId('a.title');
    expect(a).toHaveProp('numberOfLines', 2);
    expect(flat(a.props.style)).toMatchObject({
      fontSize: 15,
      fontFamily: fonts.medium,
      color: colors.foreground,
    });
    expect(flat(screen.getByTestId('b.title').props.style)).toMatchObject({
      fontSize: 16,
      fontFamily: fonts.semibold,
    });
  });

  it('speaks the subtitle too (title, subtitle, value)', async () => {
    await renderWithProviders(
      <ListRow testID="a" title="Language" subtitle="App language" value="English" onPress={() => {}} />,
    );
    expect(screen.getByRole('button', { name: 'Language, App language, English' })).toBeOnTheScreen();
  });

  it('can be a switch-like row with a state and a hint (Settings push row)', async () => {
    await renderWithProviders(
      <ListRow
        testID="a"
        title="Push notifications"
        accessibilityRole="switch"
        accessibilityState={{ checked: true }}
        accessibilityHint="Opens your phone settings"
        onPress={() => {}}
      />,
    );
    const row = screen.getByRole('switch', { name: 'Push notifications', checked: true });
    expect(row.props.accessibilityHint).toBe('Opens your phone settings');
  });

  it('paints a destructive title in errorText', async () => {
    await renderWithProviders(<ListRow testID="a" title="Delete account" destructive onPress={() => {}} />);
    expect(flat(screen.getByTestId('a.title').props.style)).toMatchObject({ color: colors.errorText });
  });

  it('fires the requested haptic with the press, and none by default', async () => {
    await renderWithProviders(
      <>
        <ListRow testID="a" title="Save" haptic="light" onPress={() => {}} />
        <ListRow testID="b" title="Open" onPress={() => {}} />
      </>,
    );
    await fireEvent.press(screen.getByTestId('a'));
    expect(haptic).toHaveBeenCalledWith('light');
    await fireEvent.press(screen.getByTestId('b'));
    expect(haptic).toHaveBeenCalledTimes(1);
  });

  it('has 16/12 padding, gap 12 and a minimum height (no fixed height, so font scale 2 fits)', async () => {
    await renderWithProviders(<ListRow testID="a" title="Row" onPress={() => {}} />);
    const style = flat(screen.getByTestId('a').props.style);
    expect(style).toMatchObject({
      paddingHorizontal: spacing['4'],
      paddingVertical: spacing['3'],
      gap: spacing['3'],
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
    });
    expect(style.height).toBeUndefined();
  });
});
