import { act } from 'react';
import { StyleSheet } from 'react-native';

import { haptic } from '@/lib/haptics';
import { colors } from '@/theme/tokens';
import { fireEvent, renderWithProviders, screen } from '@/test/render';

import { bookmarkIcon, SaveButton } from '../SaveButton';

jest.mock('@/lib/haptics', () => ({ haptic: jest.fn() }));

let mockReduceMotion = false;
jest.mock('react-native-reanimated', () => ({
  __esModule: true, // the spread drops the flag; without it `import Animated from` gets the whole module
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: () => mockReduceMotion,
}));

const advance = async (ms: number) => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
};

beforeEach(() => {
  mockReduceMotion = false;
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});

// R2 signature touch 3: the most repeated action gets a small moment. When the bookmark becomes saved it pops
// (1 -> 1.25 -> 1, about 260 ms) with the light haptic; unsaving, the first render and Reduce Motion stay still.
describe('SaveButton bookmark pop', () => {
  it('pops to 1.25 and settles back to 1 when it becomes saved, with the light haptic', async () => {
    const { rerender } = await renderWithProviders(
      <SaveButton testID="job.save.x" saved={false} onPress={() => {}} />,
    );
    await fireEvent.press(screen.getByTestId('job.save.x'));
    expect(haptic).toHaveBeenCalledWith('light');
    await rerender(<SaveButton testID="job.save.x" saved onPress={() => {}} />);
    const icon = screen.getByTestId('job.save.x.icon');
    await advance(110);
    expect(icon).toHaveAnimatedStyle({ transform: [{ scale: 1.25 }] });
    await advance(2000); // the spring's tail is invisible; let it come fully to rest
    expect(icon).toHaveAnimatedStyle({ transform: [{ scale: 1 }] });
  });

  it('does not pop on the first render of a saved job, or when it is unsaved', async () => {
    const { rerender } = await renderWithProviders(
      <SaveButton testID="job.save.x" saved onPress={() => {}} />,
    );
    const icon = screen.getByTestId('job.save.x.icon');
    await advance(110);
    expect(icon).toHaveAnimatedStyle({ transform: [{ scale: 1 }] });
    await rerender(<SaveButton testID="job.save.x" saved={false} onPress={() => {}} />);
    await advance(110);
    expect(icon).toHaveAnimatedStyle({ transform: [{ scale: 1 }] });
  });

  it('R3 #2: does not pop when the saved list arrives (saved changes without a press)', async () => {
    const { rerender } = await renderWithProviders(
      <SaveButton testID="job.save.x" saved={false} onPress={() => {}} />,
    );
    await rerender(<SaveButton testID="job.save.x" saved onPress={() => {}} />);
    await advance(110);
    expect(screen.getByTestId('job.save.x.icon')).toHaveAnimatedStyle({ transform: [{ scale: 1 }] });
  });

  it('R3 #2: does not pop when a recycled list cell shows another, saved job', async () => {
    const { rerender } = await renderWithProviders(
      <SaveButton testID="job.save.a" saved={false} onPress={() => {}} />,
    );
    // Even right after a press on job a (its save is still on the way), the cell now showing job b stays still.
    await fireEvent.press(screen.getByTestId('job.save.a'));
    await rerender(<SaveButton testID="job.save.b" saved onPress={() => {}} />);
    await advance(110);
    expect(screen.getByTestId('job.save.b.icon')).toHaveAnimatedStyle({ transform: [{ scale: 1 }] });
  });

  it('a press on a saved bookmark (unsave) does not pop when it is saved again by someone else', async () => {
    const { rerender } = await renderWithProviders(
      <SaveButton testID="job.save.x" saved onPress={() => {}} />,
    );
    await fireEvent.press(screen.getByTestId('job.save.x'));
    await rerender(<SaveButton testID="job.save.x" saved={false} onPress={() => {}} />);
    await rerender(<SaveButton testID="job.save.x" saved onPress={() => {}} />);
    await advance(110);
    expect(screen.getByTestId('job.save.x.icon')).toHaveAnimatedStyle({ transform: [{ scale: 1 }] });
  });

  it('Reduce Motion: no pop', async () => {
    mockReduceMotion = true;
    const { rerender } = await renderWithProviders(
      <SaveButton testID="job.save.x" saved={false} onPress={() => {}} />,
    );
    await fireEvent.press(screen.getByTestId('job.save.x'));
    await rerender(<SaveButton testID="job.save.x" saved onPress={() => {}} />);
    await advance(110);
    expect(screen.getByTestId('job.save.x.icon')).toHaveAnimatedStyle({ transform: [{ scale: 1 }] });
  });

  it('the details-screen button variant pops its icon too', async () => {
    const { rerender } = await renderWithProviders(
      <SaveButton testID="job.save" variant="button" saved={false} onPress={() => {}} />,
    );
    await fireEvent.press(screen.getByTestId('job.save'));
    await rerender(<SaveButton testID="job.save" variant="button" saved onPress={() => {}} />);
    await advance(110);
    expect(screen.getByTestId('job.save.icon')).toHaveAnimatedStyle({ transform: [{ scale: 1.25 }] });
  });
});

describe('SaveButton a11y (R3)', () => {
  it('Android shows saved by shape too, not by colour only (bookmark_added)', () => {
    expect(bookmarkIcon(true).android).toBe('bookmark_added');
    expect(bookmarkIcon(false).android).toBe('bookmark');
    expect(bookmarkIcon(true).ios).toBe('bookmark.fill');
  });

  it('the "Saved" label uses brandText (AA on brandSoft)', async () => {
    await renderWithProviders(<SaveButton testID="job.save" variant="button" saved onPress={() => {}} />);
    expect(StyleSheet.flatten(screen.getByText('Saved').props.style).color).toBe(colors.brandText);
  });

  it('the 44-pt bookmark reaches 48 with hitSlop', async () => {
    await renderWithProviders(<SaveButton testID="job.save.x" saved={false} onPress={() => {}} />);
    expect(44 + 2 * (screen.getByTestId('job.save.x').props.hitSlop as number)).toBeGreaterThanOrEqual(48);
  });
});
