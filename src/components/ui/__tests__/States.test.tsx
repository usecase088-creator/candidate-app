import { AccessibilityInfo, StyleSheet } from 'react-native';

import { colors, radius } from '@/theme/tokens';
import { fireEvent, renderWithProviders, screen } from '@/test/render';

import { EmptyState } from '../EmptyState';
import { ErrorState } from '../ErrorState';
import { Skeleton } from '../Skeleton';

const flat = (s: unknown) => StyleSheet.flatten(s as never) ?? {};

describe('ErrorState', () => {
  it('uses the website wording and retries', async () => {
    const onRetry = jest.fn();
    await renderWithProviders(
      <ErrorState
        testID="jobs.error"
        message="Network error. Please check your connection and try again."
        onRetry={onRetry}
      />,
    );
    expect(screen.getByRole('header', { name: 'Something went wrong' })).toBeOnTheScreen();
    expect(screen.getByText('Network error. Please check your connection and try again.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Try Again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('jobs.error.retry')).toBeOnTheScreen();
  });

  it('accepts a custom title and works without retry', async () => {
    await renderWithProviders(<ErrorState testID="e" title="Job not found" message="It may have closed." />);
    expect(screen.getByText('Job not found')).toBeOnTheScreen();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows a spinner on the retry button while retrying', async () => {
    await renderWithProviders(<ErrorState testID="e" message="x" onRetry={() => {}} retrying />);
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeBusy();
  });
});

describe('EmptyState', () => {
  it('shows title, message and an optional action', async () => {
    const onPress = jest.fn();
    await renderWithProviders(
      <EmptyState
        testID="saved.empty"
        title="No saved jobs yet"
        message="Save jobs to find them here."
        action={{ label: 'Browse jobs', onPress }}
      />,
    );
    expect(screen.getByRole('header', { name: 'No saved jobs yet' })).toBeOnTheScreen();
    expect(screen.getByText('Save jobs to find them here.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('saved.empty.action'));
    expect(onPress).toHaveBeenCalled();
  });

  it('works with a title only', async () => {
    await renderWithProviders(<EmptyState testID="e" title="Nothing here" />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('Skeleton', () => {
  // Reduce Motion on: no endless pulse animation keeping the test renderer busy.
  beforeEach(() => jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true));

  it('does not pulse when Reduce Motion is on', async () => {
    await renderWithProviders(<Skeleton testID="s" width={10} height={10} />);
    expect(flat(screen.getByTestId('s', { includeHiddenElements: true }).props.style).opacity).toBe(1);
  });

  it('draws a muted block of the given size', async () => {
    await renderWithProviders(<Skeleton testID="s" width={120} height={16} />);
    expect(flat(screen.getByTestId('s', { includeHiddenElements: true }).props.style)).toMatchObject({
      width: 120,
      height: 16,
      backgroundColor: colors.muted,
      borderRadius: radius.sm,
    });
  });

  it('is invisible to screen readers (the screen announces loading instead)', async () => {
    await renderWithProviders(<Skeleton testID="s" width={10} height={10} />);
    expect(screen.queryByTestId('s')).toBeNull();
    expect(screen.getByTestId('s', { includeHiddenElements: true }).props.importantForAccessibility).toBe(
      'no-hide-descendants',
    );
  });
});
