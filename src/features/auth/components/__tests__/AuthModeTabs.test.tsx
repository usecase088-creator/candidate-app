import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import { colors, radius, shadows } from '@/theme/tokens';

import { AuthModeTabs } from '../AuthModeTabs';

jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }));

const style = (id: string) => StyleSheet.flatten(screen.getByTestId(id).props.style);

beforeEach(() => jest.clearAllMocks());

describe('AuthModeTabs (D32 segmented control)', () => {
  it('is a 40-pt surface2 track, radius 12, with a white sliding segment (soft shadow)', async () => {
    await render(<AuthModeTabs active="signin" />);
    expect(style('auth.tabs')).toMatchObject({
      height: 40,
      backgroundColor: colors.surface2,
      borderRadius: radius.md,
    });
    expect(style('auth.tabs.indicator')).toMatchObject({
      backgroundColor: colors.surface,
      boxShadow: shadows.soft,
    });
  });

  it('labels are 15/600 on one line, and there is no "New" badge', async () => {
    await render(<AuthModeTabs active="signup" />);
    for (const label of ['Sign In', 'Create Account']) {
      const text = screen.getByText(label);
      expect(text).toHaveProp('numberOfLines', 1);
      expect(StyleSheet.flatten(text.props.style)).toMatchObject({ fontSize: 15 });
    }
    expect(screen.queryByText('New')).toBeNull();
  });

  it('marks the active tab selected and switches with replace', async () => {
    await render(<AuthModeTabs active="signin" />);
    expect(screen.getByRole('tab', { name: 'Sign In' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'Create Account' })).not.toBeSelected();
    await fireEvent.press(screen.getByTestId('auth.tab.signin'));
    expect(router.replace).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId('auth.tab.signup'));
    expect(router.replace).toHaveBeenCalledWith('/signup');
  });
});
