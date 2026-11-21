import { StyleSheet, Text } from 'react-native';

import { colors, radius } from '@/theme/tokens';
import { fireEvent, renderWithProviders, screen } from '@/test/render';

import { Button } from '../Button';
import { Panel, type PanelTone } from '../Panel';

const flat = (s: unknown) => StyleSheet.flatten(s as never) ?? {};

// D32: one tinted panel replaces the yellow / lavender / green boxes on application details. The tone colours the fill
// and the icon; title and body stay near-black so the text is readable on every tint.
describe('Panel', () => {
  it('is a flat 12-radius box with 16 padding, a 17/600 title and near-black body text', async () => {
    await renderWithProviders(
      <Panel testID="app.next" tone="info" title="What happens next">
        <Text>The hospital reviews your profile within 7 days.</Text>
      </Panel>,
    );
    const box = flat(screen.getByTestId('app.next').props.style);
    expect(box).toMatchObject({
      backgroundColor: colors.skySoft,
      borderRadius: radius.md,
      padding: 16,
      gap: 8,
    });
    expect(box.borderWidth).toBeUndefined();
    const title = screen.getByTestId('app.next.title');
    expect(title).toHaveTextContent('What happens next');
    expect(flat(title.props.style)).toMatchObject({ fontSize: 17, color: colors.foreground });
    expect(title.props.accessibilityRole).toBe('header');
    expect(screen.getByText('The hospital reviews your profile within 7 days.')).toBeOnTheScreen();
    expect(screen.getByTestId('app.next').props.accessible).toBe(false);
  });

  it.each<[PanelTone, string, string]>([
    ['neutral', colors.muted, colors.foreground],
    ['info', colors.skySoft, colors.skyText],
    ['success', colors.successSoft, colors.successText],
    ['warning', colors.amberSoft, colors.amberText],
    ['error', colors.destructiveSoft, colors.errorText],
  ])(
    'tone %s: fill and icon colour from the tokens, body text never coloured',
    async (tone, fill, iconColor) => {
      await renderWithProviders(
        <Panel testID="p" tone={tone} title="Title" icon={{ ios: 'info.circle', android: 'info' }}>
          <Text>Body</Text>
        </Panel>,
      );
      expect(flat(screen.getByTestId('p').props.style).backgroundColor).toBe(fill);
      const icon = screen.getByTestId('p.icon');
      expect(icon.props.tintColor).toBe(iconColor);
      expect(icon.props.size).toBe(20);
      expect(flat(screen.getByTestId('p.title').props.style).color).toBe(colors.foreground);
    },
  );

  it('has no icon slot when no icon is given', async () => {
    await renderWithProviders(
      <Panel testID="p" tone="neutral" title="Title">
        <Text>Body</Text>
      </Panel>,
    );
    expect(screen.queryByTestId('p.icon')).toBeNull();
  });

  it('renders the actions row at the bottom, 8 apart', async () => {
    const onPress = jest.fn();
    await renderWithProviders(
      <Panel
        testID="p"
        tone="warning"
        title="Interview on Monday"
        actions={<Button testID="p.confirm" label="Confirm" size="sm" fullWidth={false} onPress={onPress} />}
      >
        <Text>Body</Text>
      </Panel>,
    );
    expect(flat(screen.getByTestId('p.actions').props.style)).toMatchObject({ flexDirection: 'row', gap: 8 });
    await fireEvent.press(screen.getByRole('button', { name: 'Confirm' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
