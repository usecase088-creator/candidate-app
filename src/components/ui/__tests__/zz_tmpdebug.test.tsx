import { fireEvent, renderWithProviders, screen } from '@/test/render';
import { LogoTile } from '../LogoTile';

it('debug', async () => {
  await renderWithProviders(<LogoTile testID="logo" name="Seed City" uri="https://cdn.example/broken.png" />);
  const el = screen.getByTestId('logo.image');
  console.log('host onError type', typeof el.props.onError, 'parent', el.parent?.type, typeof el.parent?.props.onError);
  try {
    fireEvent(el, 'error', { nativeEvent: { error: 'x' } });
  } catch (e) {
    console.log('THREW', String(e), (e as Error).stack?.split('\n').slice(0, 6).join('\n'));
  }
  console.log('after', screen.queryByTestId('logo.image') ? 'still there' : 'gone');
});
