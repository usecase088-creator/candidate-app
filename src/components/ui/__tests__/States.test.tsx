import { act } from 'react';
import { processColor, StyleSheet } from 'react-native';

import { colors, radius } from '@/theme/tokens';
import { fireEvent, renderWithProviders, screen } from '@/test/render';

import { EmptyState } from '../EmptyState';
import { ErrorState } from '../ErrorState';
import { Skeleton } from '../Skeleton';
import { JobRowSkeleton, ListRowSkeleton } from '../SkeletonPresets';

let mockReduceMotion = false;
jest.mock('react-native-reanimated', () => ({
  __esModule: true, // the spread drops the flag; without it `import Animated from` gets the whole module
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: () => mockReduceMotion,
}));

const flat = (s: unknown) => StyleSheet.flatten(s as never) ?? {};
const hidden = { includeHiddenElements: true } as const;

beforeEach(() => {
  mockReduceMotion = false;
});

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

  describe('D32 look', () => {
    it('64-pt destructiveSoft circle with a 28-pt warning icon in errorText', async () => {
      await renderWithProviders(<ErrorState testID="e" message="x" onRetry={() => {}} />);
      expect(flat(screen.getByTestId('e.iconCircle').props.style)).toMatchObject({
        width: 64,
        height: 64,
        borderRadius: radius.full,
        backgroundColor: colors.destructiveSoft,
      });
      const icon = screen.getByTestId('e.icon');
      expect(icon).toHaveProp('tintColor', colors.errorText);
      expect(icon).toHaveProp('name', 'exclamationmark.triangle');
      expect(flat(icon.props.style)).toMatchObject({ width: 28, height: 28 });
    });

    it('takes a custom icon', async () => {
      await renderWithProviders(
        <ErrorState
          testID="e"
          message="x"
          icon={{ ios: 'wifi.slash', android: 'wifi_off', web: 'wifi_off' }}
        />,
      );
      expect(screen.getByTestId('e.icon')).toHaveProp('name', 'wifi.slash');
    });

    it('heading title and muted body message, both centred, message capped at 320 wide', async () => {
      await renderWithProviders(<ErrorState testID="e" message="Please try again later." />);
      const title = screen.getByText('Something went wrong');
      expect(flat(title.props.style)).toMatchObject({ fontSize: 17, textAlign: 'center' });
      const message = screen.getByText('Please try again later.');
      expect(flat(message.props.style)).toMatchObject({
        fontSize: 15,
        color: colors.mutedForeground,
        textAlign: 'center',
        maxWidth: 320,
      });
    });

    it('one self-sized secondary md action; container grows and centres', async () => {
      await renderWithProviders(<ErrorState testID="e" message="x" onRetry={() => {}} />);
      const button = flat(screen.getByTestId('e.retry').props.style);
      // Was: `outline` (white + 1-px border). D32: tonal secondary, 44-pt md, hugging its label.
      // R2: `fill` instead of surface2 (issue 2) and centred instead of flex-start (issue 1: it sat off-centre).
      expect(button).toMatchObject({
        backgroundColor: colors.fill,
        minHeight: 44,
        alignSelf: 'center',
      });
      expect(button.borderWidth).toBeUndefined();
      expect(flat(screen.getByTestId('e').props.style)).toMatchObject({
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 32,
        paddingHorizontal: 24,
        gap: 12,
      });
    });
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
    expect(screen.getByTestId('e.icon')).toBeOnTheScreen();
  });

  describe('D32 look', () => {
    it('64-pt brandSoft circle with a 28-pt tray icon in brand', async () => {
      await renderWithProviders(<EmptyState testID="e" title="Nothing here" />);
      expect(flat(screen.getByTestId('e.iconCircle').props.style)).toMatchObject({
        width: 64,
        height: 64,
        borderRadius: radius.full,
        backgroundColor: colors.brandSoft,
      });
      const icon = screen.getByTestId('e.icon');
      expect(icon).toHaveProp('tintColor', colors.brand);
      expect(icon).toHaveProp('name', 'tray');
      expect(flat(icon.props.style)).toMatchObject({ width: 28, height: 28 });
    });

    it('takes a custom icon', async () => {
      await renderWithProviders(
        <EmptyState testID="e" title="x" icon={{ ios: 'bookmark', android: 'bookmark', web: 'bookmark' }} />,
      );
      expect(screen.getByTestId('e.icon')).toHaveProp('name', 'bookmark');
    });

    it('centred heading + muted body capped at 320, one self-sized secondary md action', async () => {
      await renderWithProviders(
        <EmptyState
          testID="e"
          title="No results"
          message="Try other words."
          action={{ label: 'Clear', onPress: () => {} }}
        />,
      );
      expect(flat(screen.getByText('No results').props.style)).toMatchObject({
        fontSize: 17,
        textAlign: 'center',
      });
      expect(flat(screen.getByText('Try other words.').props.style)).toMatchObject({
        fontSize: 15,
        color: colors.mutedForeground,
        textAlign: 'center',
        maxWidth: 320,
      });
      // Was: `outline`. D32: tonal secondary, md, hugging its label.
      // R2: `fill` instead of surface2 (issue 2) and centred instead of flex-start (issue 1: it sat off-centre).
      expect(flat(screen.getByTestId('e.action').props.style)).toMatchObject({
        backgroundColor: colors.fill,
        minHeight: 44,
        alignSelf: 'center',
      });
      expect(flat(screen.getByTestId('e').props.style)).toMatchObject({
        flexGrow: 1,
        paddingVertical: 32,
        paddingHorizontal: 24,
        gap: 12,
      });
    });
  });
});

describe('Skeleton', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const advance = async (ms: number) => {
    await act(async () => {
      jest.advanceTimersByTime(ms);
    });
  };

  it('draws a muted block of the given size', async () => {
    await renderWithProviders(<Skeleton testID="s" width={120} height={16} />);
    expect(flat(screen.getByTestId('s', hidden).props.style)).toMatchObject({
      width: 120,
      height: 16,
      backgroundColor: colors.muted,
      borderRadius: radius.sm,
      overflow: 'hidden',
    });
  });

  it('is invisible to screen readers (the screen announces loading instead)', async () => {
    await renderWithProviders(<Skeleton testID="s" width={10} height={10} />);
    expect(screen.queryByTestId('s')).toBeNull();
    expect(screen.getByTestId('s', hidden).props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('shimmers: a brandSoft-to-muted gradient strip sweeps left to right over 1200 ms and loops', async () => {
    await renderWithProviders(<Skeleton testID="s" width={120} height={16} />);
    const block = screen.getByTestId('s', hidden);
    await fireEvent(block, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 120, height: 16 } } });
    const strip = screen.getByTestId('s.shimmer', hidden);
    // The native gradient receives processed colours.
    expect(strip).toHaveProp(
      'colors',
      [colors.muted, colors.brandSoft, colors.muted].map((c) => processColor(c)),
    );
    await advance(0);
    expect(strip).toHaveAnimatedStyle({ transform: [{ translateX: -120 }] });
    await advance(1200);
    expect(strip).toHaveAnimatedStyle({ transform: [{ translateX: 120 }] });
    await advance(1200);
    expect(strip).toHaveAnimatedStyle({ transform: [{ translateX: 120 }] }); // restarted from -120, back at the end
    expect(block).toHaveAnimatedStyle({ opacity: 1 });
  });

  it('Reduce Motion: no sweep, the opacity pulse instead', async () => {
    // Was: "does not pulse when Reduce Motion is on" (RN Animated pulse). D32: the sweep is the motion that is
    // dropped; a slow opacity pulse (a crossfade) stays, as the brief asks.
    mockReduceMotion = true;
    await renderWithProviders(<Skeleton testID="s" width={120} height={16} />);
    expect(screen.queryByTestId('s.shimmer', hidden)).toBeNull();
    const block = screen.getByTestId('s', hidden);
    await advance(0);
    expect(block).toHaveAnimatedStyle({ opacity: 1 });
    await advance(700);
    expect(block).toHaveAnimatedStyle({ opacity: 0.5 });
    await advance(700);
    expect(block).toHaveAnimatedStyle({ opacity: 1 });
  });
});

describe('SkeletonPresets', () => {
  it('JobRowSkeleton mirrors a JobRow: 40 logo, four lines, a 56x22 pill, hairline separator; one by default', async () => {
    await renderWithProviders(<JobRowSkeleton testID="jobs.loading" />);
    const group = screen.getByTestId('jobs.loading');
    expect(group).toHaveProp('accessibilityLabel', 'Loading');
    expect(screen.getByLabelText('Loading')).toBeOnTheScreen();
    const row = screen.getByTestId('jobs.loading.0', hidden);
    expect(flat(row.props.style)).toMatchObject({ paddingVertical: 12, borderBottomColor: colors.separator });
    expect(flat(row.props.style).borderBottomWidth).toBe(StyleSheet.hairlineWidth);
    expect(flat(screen.getByTestId('jobs.loading.0.logo', hidden).props.style)).toMatchObject({
      width: 40,
      height: 40,
      borderRadius: radius.md,
    });
    expect(flat(screen.getByTestId('jobs.loading.0.title', hidden).props.style)).toMatchObject({
      width: '70%',
      height: 16,
    });
    expect(flat(screen.getByTestId('jobs.loading.0.line2', hidden).props.style)).toMatchObject({
      width: '55%',
      height: 14,
    });
    expect(flat(screen.getByTestId('jobs.loading.0.line3', hidden).props.style)).toMatchObject({
      width: '45%',
      height: 13,
    });
    expect(flat(screen.getByTestId('jobs.loading.0.line4', hidden).props.style)).toMatchObject({
      width: '30%',
      height: 15,
    });
    expect(flat(screen.getByTestId('jobs.loading.0.pill', hidden).props.style)).toMatchObject({
      width: 56,
      height: 22,
      borderRadius: radius.full,
    });
    expect(screen.queryByTestId('jobs.loading.1', hidden)).toBeNull();
  });

  it('JobRowSkeleton renders `count` rows', async () => {
    await renderWithProviders(<JobRowSkeleton testID="l" count={3} />);
    expect(screen.getAllByTestId(/^l\.\d+$/, hidden)).toHaveLength(3);
  });

  it('ListRowSkeleton: 52-pt row with a 24 circle and a 60% line, `count` rows, labelled Loading', async () => {
    await renderWithProviders(<ListRowSkeleton testID="n" count={2} />);
    expect(screen.getByTestId('n')).toHaveProp('accessibilityLabel', 'Loading');
    expect(screen.getAllByTestId(/^n\.\d+$/, hidden)).toHaveLength(2);
    const row = flat(screen.getByTestId('n.0', hidden).props.style);
    expect(row).toMatchObject({ height: 52, paddingHorizontal: 16, borderBottomColor: colors.separator });
    expect(flat(screen.getByTestId('n.0.leading', hidden).props.style)).toMatchObject({
      width: 24,
      height: 24,
      borderRadius: radius.full,
    });
    expect(flat(screen.getByTestId('n.0.line', hidden).props.style)).toMatchObject({
      width: '60%',
      height: 15,
    });
  });
});
