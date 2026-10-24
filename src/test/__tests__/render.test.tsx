import { useQueryClient } from '@tanstack/react-query';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { renderWithProviders, screen } from '../render';

function Probe() {
  const client = useQueryClient();
  const insets = useSafeAreaInsets();
  const retry = client.getDefaultOptions().queries?.retry;
  return <Text>{`retry:${String(retry)} top:${insets.top}`}</Text>;
}

describe('renderWithProviders', () => {
  it('provides a QueryClient with retries off and safe-area insets', async () => {
    await renderWithProviders(<Probe />);
    expect(screen.getByText('retry:false top:0')).toBeOnTheScreen();
  });

  it('gives every render its own QueryClient', async () => {
    const seen: unknown[] = [];
    function Capture() {
      seen.push(useQueryClient());
      return null;
    }
    await renderWithProviders(<Capture />);
    await renderWithProviders(<Capture />);
    expect(seen[0]).not.toBe(seen[1]);
  });
});
