import { StyleSheet } from 'react-native';

import { haptic } from '@/lib/haptics';
import { colors } from '@/theme/tokens';
import { makeJob } from '@/test/msw/jobs';
import { fireEvent, renderWithProviders, screen } from '@/test/render';

import { JobRow } from '../JobRow';

jest.mock('@/lib/haptics', () => ({ haptic: jest.fn() }));

const flat = (s: unknown) => StyleSheet.flatten(s as never) ?? {};
afterEach(() => jest.clearAllMocks());

const job = makeJob({
  id: 'n1',
  role: 'Staff Nurse',
  hospital: 'Seed City Multispeciality Hospital',
  hospitalVerified: true,
  hospitalLogoUrl: null,
  specialty: 'Nursing',
  type: 'Full-time',
  experienceMin: 1,
  experienceMax: 5,
  salaryMin: 3,
  salaryMax: 4.5,
  location: 'Kolkata, West Bengal',
  postedDays: 0,
  matchPercent: 52,
});

// D32 JobRow (docs/design/UI-REDESIGN.md, audit B 5.4): one compact row per job instead of a 300-pt card with a
// "View Details" slab. 4-5 jobs fit a small screen. Same testIDs the screens and Maestro flows use.
describe('JobRow', () => {
  it('keeps the card, open and save testIDs the screens and flows rely on', async () => {
    await renderWithProviders(<JobRow job={job} saved={false} onOpen={() => {}} onToggleSave={() => {}} />);
    expect(screen.getByTestId('job.card.n1')).toBeOnTheScreen();
    expect(screen.getByTestId('job.open.n1')).toBeOnTheScreen();
    expect(screen.getByTestId('job.title.n1')).toBeOnTheScreen();
    expect(screen.getByTestId('job.save.n1')).toBeOnTheScreen();
  });

  it('the whole row opens the job and reads as one sentence to a screen reader', async () => {
    const onOpen = jest.fn();
    await renderWithProviders(<JobRow job={job} saved={false} onOpen={onOpen} onToggleSave={() => {}} />);
    const row = screen.getByRole('button', {
      name: 'Staff Nurse at Seed City Multispeciality Hospital, verified hospital, ₹3–4.5 LPA, 52% match',
    });
    await fireEvent.press(row);
    expect(onOpen).toHaveBeenCalledWith(job);
  });

  it('role first (16 semibold), hospital, one meta line, salary with tabular digits', async () => {
    await renderWithProviders(<JobRow job={job} saved={false} onOpen={() => {}} onToggleSave={() => {}} />);
    const role = screen.getByText('Staff Nurse');
    expect(flat(role.props.style)).toMatchObject({ fontSize: 16 });
    expect(role).toHaveProp('numberOfLines', 2);
    expect(screen.getByText('Seed City Multispeciality Hospital')).toHaveProp('numberOfLines', 1);
    expect(screen.getByText('Nursing · Full-time · 1–5 yrs')).toBeOnTheScreen();
    const salary = screen.getByText('₹3–4.5 LPA');
    expect(flat(salary.props.style)).toMatchObject({ fontVariant: ['tabular-nums'] });
    expect(screen.getByText('Kolkata, West Bengal · Today')).toBeOnTheScreen();
  });

  it('shows the match as a pill, and no pill when there is no score (guest)', async () => {
    const { rerender } = await renderWithProviders(
      <JobRow job={job} saved={false} onOpen={() => {}} onToggleSave={() => {}} />,
    );
    expect(screen.getByTestId('job.match.n1')).toHaveTextContent('52% match');
    await rerender(
      <JobRow job={{ ...job, matchPercent: null }} saved={false} onOpen={() => {}} onToggleSave={() => {}} />,
    );
    expect(screen.queryByTestId('job.match.n1')).toBeNull();
  });

  it('the bookmark is a separate 44-pt target with a light haptic, not nested in the row button', async () => {
    const onToggleSave = jest.fn();
    await renderWithProviders(
      <JobRow job={job} saved={false} onOpen={() => {}} onToggleSave={onToggleSave} />,
    );
    const save = screen.getByRole('button', { name: 'Save job' });
    await fireEvent.press(save);
    expect(onToggleSave).toHaveBeenCalledWith(job);
    expect(haptic).toHaveBeenCalledWith('light');
    const s = flat(save.props.style);
    expect(s.width).toBeGreaterThanOrEqual(44);
    expect(s.height).toBeGreaterThanOrEqual(44);
  });

  it('saved: the bookmark says so and is filled', async () => {
    await renderWithProviders(<JobRow job={job} saved onOpen={() => {}} onToggleSave={() => {}} />);
    expect(screen.getByRole('button', { name: 'Remove from saved jobs' })).toHaveProp('accessibilityState', {
      selected: true,
    });
  });

  it('a hospital without a logo gets its initials; the verified check sits inline', async () => {
    await renderWithProviders(<JobRow job={job} saved={false} onOpen={() => {}} onToggleSave={() => {}} />);
    expect(screen.getByText('SC')).toBeOnTheScreen();
    expect(screen.getByTestId('job.verified.n1')).toBeOnTheScreen();
  });

  // Was "no card background: rows sit on the canvas" with a full-bleed bottom border. R2 issue 15: white rows read as
  // one sheet, and the hairline is inset under the text column (16 margin + 40 logo + 12 gap), not edge to edge.
  it('no border or radius: a white row with a hairline inset under the text column', async () => {
    await renderWithProviders(<JobRow job={job} saved={false} onOpen={() => {}} onToggleSave={() => {}} />);
    const s = flat(screen.getByTestId('job.card.n1').props.style);
    expect(s.borderWidth).toBeUndefined();
    expect(s.borderRadius).toBeUndefined();
    expect(s.borderBottomWidth).toBeUndefined();
    expect(s.backgroundColor).toBe(colors.surface);
    expect(flat(screen.getByTestId('job.separator.n1').props.style)).toMatchObject({
      position: 'absolute',
      left: 16 + 40 + 12,
      right: 0,
      bottom: 0,
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.separator,
    });
  });
});
