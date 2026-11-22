import { StyleSheet } from 'react-native';

import { useSession } from '@/features/auth/sessionStore';
import { fontSizes, headingLetterSpacing } from '@/theme/tokens';
import { renderWithProviders, screen } from '@/test/render';

import { TopBar } from '../components/TopBar';

const flat = (s: unknown) => StyleSheet.flatten(s as never) ?? {};

// D32: one slim bar per tab. Home shows the wordmark; the other tabs show their title here instead of a second
// 24-pt title inside the screen. Signed out: a Sign in button where the bell would be.
describe('TopBar (D32)', () => {
  it('Home: wordmark, 44 pt, no title header', async () => {
    useSession.setState({ status: 'signedIn' } as never);
    await renderWithProviders(<TopBar />);
    expect(screen.getByTestId('topbar.brand')).toHaveTextContent('ApronHanger');
    expect(flat(screen.getByTestId('topbar').props.style).minHeight).toBe(44);
    expect(screen.queryByRole('header')).toBeNull();
    // R3 #13: the wordmark comes from the type ramp (17/22, tight heading tracking), not loose numbers.
    expect(flat(screen.getByTestId('topbar.brand').props.style)).toMatchObject({
      fontSize: fontSizes.xl.fontSize,
      lineHeight: fontSizes.xl.lineHeight,
      letterSpacing: headingLetterSpacing(fontSizes.xl.fontSize),
    });
  });

  it('other tabs: the title is the header, the wordmark is gone', async () => {
    useSession.setState({ status: 'signedIn' } as never);
    await renderWithProviders(<TopBar title="My Applications" />);
    expect(screen.getByRole('header', { name: 'My Applications' })).toBeOnTheScreen();
    expect(screen.queryByTestId('topbar.brand')).toBeNull();
    expect(screen.getByTestId('topbar.title')).toHaveProp('maxFontSizeMultiplier', 1.5);
  });

  it('signed out: a Sign in button instead of the bell, capped at 1.3x', async () => {
    useSession.setState({ status: 'signedOut', signOutReason: undefined } as never);
    await renderWithProviders(<TopBar title="Profile" />);
    expect(screen.getByTestId('topbar.signin')).toBeOnTheScreen();
    expect(screen.queryByTestId('topbar.notifications')).toBeNull();
    expect(screen.getByText('Sign in')).toHaveProp('maxFontSizeMultiplier', 1.3);
  });
});
