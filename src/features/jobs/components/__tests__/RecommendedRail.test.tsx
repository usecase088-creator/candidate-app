// The Home rail on its own (D32 round 2): width for one card, the seal next to the hospital, the tag as a pill,
// the match as a ring. The ordering and the prompt are covered through the Home screen in HomeScreen.test.
import { Dimensions, StyleSheet } from 'react-native';

import { makeJob } from '@/test/msw/jobs';
import { renderWithProviders, screen, within } from '@/test/render';
import { colors } from '@/theme/tokens';

import type { MatchedJob } from '../../logic/match';
import { RecommendedRail } from '../RecommendedRail';

const flat = (s: unknown) => StyleSheet.flatten(s as never) ?? {};
const matched = (id: string, over: Partial<MatchedJob> = {}): MatchedJob => ({
  ...makeJob({ id, role: `Role ${id}`, hospital: `Hospital ${id}`, hospitalVerified: true }),
  matchPercent: 82,
  ...over,
});
const show = (jobs: MatchedJob[]) =>
  renderWithProviders(<RecommendedRail jobs={jobs} showPrompt={false} onOpen={jest.fn()} />);

describe('RecommendedRail', () => {
  it('one job: the card takes the full content width (no empty third of the row)', async () => {
    await show([matched('a')]);
    const width = Dimensions.get('window').width;
    expect(flat(screen.getByTestId('recommended.job.a').props.style).width).toBe(width - 32);
  });

  it('several jobs: fixed-width cards that scroll', async () => {
    await show([matched('a'), matched('b')]);
    expect(flat(screen.getByTestId('recommended.job.a').props.style).width).toBe(240);
    expect(flat(screen.getByTestId('recommended.job.b').props.style).width).toBe(240);
  });

  it('the verified seal sits right after the hospital name, not at the far edge', async () => {
    await show([matched('a')]);
    const card = within(screen.getByTestId('recommended.job.a'));
    expect(card.getByTestId('recommended.verified.a')).toBeOnTheScreen();
    const name = flat(card.getByText('Hospital a').props.style);
    expect(name.flex).toBeUndefined();
    expect(name.flexShrink).toBe(1);
  });

  it('no seal for a hospital that is not verified', async () => {
    await show([matched('a', { hospitalVerified: false })]);
    expect(screen.queryByTestId('recommended.verified.a')).not.toBeOnTheScreen();
  });

  it('"Matched to your profile" is a small brand pill, not brand-coloured plain text', async () => {
    await show([matched('a')]);
    const tag = screen.getByTestId('recommended.tag');
    expect(tag).toHaveTextContent('Matched to your profile');
    expect(flat(tag.props.style).backgroundColor).toBe(colors.brandSoft);
  });

  it('the match is a 36-pt ring that says "82% match"', async () => {
    await show([matched('a')]);
    const ring = screen.getByTestId('recommended.match.a');
    expect(ring.props.accessibilityLabel).toBe('82% match');
    expect(flat(ring.props.style).width).toBe(36);
    expect(within(ring).getByText('82%')).toBeOnTheScreen();
  });
});
