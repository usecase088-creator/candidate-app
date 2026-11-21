import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { colors } from '@/theme/tokens';

import { FormMessage } from '../FormMessage';

const box = (id: string) => StyleSheet.flatten(screen.getByTestId(id).props.style);

describe('FormMessage (D32 auth message box)', () => {
  it('renders nothing without a message', async () => {
    await render(<FormMessage testID="m" tone="error" message={undefined} />);
    expect(screen.queryByTestId('m')).toBeNull();
  });

  it('error: tinted fill without a border, a 20-pt icon and an alert for screen readers', async () => {
    await render(<FormMessage testID="m" tone="error" message="Enter a valid email" />);
    expect(screen.getByTestId('m')).toHaveTextContent('Enter a valid email');
    expect(screen.getByRole('alert', { name: 'Enter a valid email' })).toBeOnTheScreen();
    expect(box('m')).toMatchObject({ backgroundColor: colors.destructiveSoft });
    expect(box('m').borderWidth ?? 0).toBe(0);
    expect(screen.getByTestId('m.icon', { includeHiddenElements: true }).props.size).toBeDefined();
    expect(StyleSheet.flatten(screen.getByText('Enter a valid email').props.style)).toMatchObject({
      fontSize: 14,
      lineHeight: 20,
      color: colors.errorText,
    });
  });

  it('info: neutral blue tint, read out politely but not as an alert', async () => {
    await render(<FormMessage testID="m" tone="info" message="Your account has been deleted." />);
    expect(box('m')).toMatchObject({ backgroundColor: colors.skySoft });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByTestId('m')).toHaveProp('accessibilityLiveRegion', 'polite');
    expect(StyleSheet.flatten(screen.getByText('Your account has been deleted.').props.style)).toMatchObject({
      color: colors.foreground,
    });
  });
});
