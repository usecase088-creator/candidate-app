import { StyleSheet } from 'react-native';

import { ApplicationSchema } from '@/api/schemas/applications';
import {
  applied,
  documentsRequested,
  interviewVirtual,
  joiningConfirmed,
  offerSent,
  rejected,
} from '@/test/fixtures/applications';
import { colors } from '@/theme/tokens';
import { fireEvent, renderWithProviders, screen, within } from '@/test/render';

import { ApplicationCard } from '../ApplicationCard';
import { ProgressSegments } from '../ProgressSegments';
import { StatusPill } from '../StatusPill';
import { VerticalTimeline } from '../VerticalTimeline';

const parse = (a: unknown) => ApplicationSchema.parse(a);
const flat = (s: unknown) => StyleSheet.flatten(s as never) ?? {};

describe('StatusPill', () => {
  it.each([
    ['Applied', 'Applied'],
    ['InterviewScheduled', 'Interview Scheduled'],
    ['AdditionalDocumentsRequired', 'Additional Docs Required'],
    ['New', 'Applied'],
    ['Contacted', 'Offer Sent'],
  ])('%s reads "%s"', async (status, label) => {
    await renderWithProviders(<StatusPill testID="p" status={status} />);
    expect(screen.getByTestId('p')).toHaveTextContent(label);
  });

  // D32: the colour says what the status needs (amber = needs you, blue = waiting, green = done, red = closed),
  // not which stage it is; the old indigo / amber / emerald stage groups are gone.
  it('colours by need: amber needs you, blue waiting, green done, red closed', async () => {
    const tones: [string, string, string][] = [
      ['InterviewScheduled', colors.amberSoft, colors.amberText],
      ['DocumentsRequested', colors.amberSoft, colors.amberText],
      ['OfferSent', colors.amberSoft, colors.amberText],
      ['Reviewed', colors.skySoft, colors.skyText],
      ['InterviewAccepted', colors.skySoft, colors.skyText],
      ['Joined', colors.successSoft, colors.successText],
      ['Rejected', colors.destructiveSoft, colors.errorText],
    ];
    for (const [status, bg, fg] of tones) {
      const { unmount } = await renderWithProviders(<StatusPill testID="p" status={status} />);
      expect(flat(screen.getByTestId('p.pill').props.style).backgroundColor).toBe(bg);
      expect(flat(screen.getByTestId('p.pill.label').props.style).color).toBe(fg);
      await unmount();
    }
  });

  it('is announced as the status', async () => {
    await renderWithProviders(<StatusPill testID="p" status="OfferSent" />);
    expect(screen.getByLabelText('Status: Offer Sent')).toBeOnTheScreen();
  });
});

describe('ProgressSegments', () => {
  // D32: the numbered dots became a 4-pt five-segment bar with a "Step n of 5" caption (round 2: the stage name left
  // the caption, the pill next to it already says it); the spoken progress keeps its shape and the name.
  it('fills the segments up to the current step, names it, and says it in words for screen readers', async () => {
    await renderWithProviders(<ProgressSegments testID="t" status="DocumentsRequested" />);
    expect(screen.getByLabelText('Progress: step 4 of 5, Documents')).toBeOnTheScreen();
    expect(screen.getByText('Step 4 of 5')).toBeOnTheScreen();
    for (let i = 0; i < 5; i++) expect(screen.getByTestId(`t.segment.${i}`)).toBeOnTheScreen();
    expect(flat(screen.getByTestId('t.segment.3').props.style).backgroundColor).toBe(colors.brand);
    expect(flat(screen.getByTestId('t.segment.4').props.style).backgroundColor).not.toBe(colors.brand);
    // R3 #12: a progress bar with a value, like CompletenessRing and MatchRing.
    const bar = screen.getByTestId('t');
    expect(bar.props.accessibilityRole).toBe('progressbar');
    expect(bar.props.accessibilityValue).toEqual({ min: 0, max: 5, now: 4 });
  });

  it('a rejection shows the website sentence instead of the bar', async () => {
    await renderWithProviders(<ProgressSegments testID="t" status="Rejected" />);
    expect(screen.getByText('Application closed by recruiter')).toBeOnTheScreen();
    expect(screen.queryByTestId('t.segment.0')).not.toBeOnTheScreen();
  });

  it('a closed job shows the closed sentence', async () => {
    await renderWithProviders(<ProgressSegments testID="t" status="JobClosed" />);
    expect(
      screen.getByText(
        'This job posting has been closed. You are no longer in the active pipeline for this role.',
      ),
    ).toBeOnTheScreen();
  });
});

describe('VerticalTimeline', () => {
  const show = (row: unknown) =>
    renderWithProviders(<VerticalTimeline testID="vt" application={parse(row)} />);

  it('lists the five stages with the current one marked and the last update under it', async () => {
    await show(interviewVirtual);
    for (const [i, name] of ['Applied', 'Reviewed', 'Interview', 'Documents', 'Offer & Joining'].entries()) {
      expect(within(screen.getByTestId(`vt.row.${i}`)).getByText(name)).toBeOnTheScreen();
    }
    expect(screen.getByText('Status updated to Interview Scheduled')).toBeOnTheScreen();
  });

  it('R3 #12 / a11y P2-10: each stage is one spoken element with its state and date; no ignored container label', async () => {
    await show(interviewVirtual);
    expect(screen.getByTestId('vt').props.accessibilityLabel).toBeUndefined();
    const row = (i: number) => screen.getByTestId(`vt.row.${i}`);
    expect(row(0).props.accessible).toBe(true);
    expect(row(0).props.accessibilityLabel).toBe('Applied, done, 21 Oct 2026');
    expect(row(1).props.accessibilityLabel).toBe('Reviewed, done');
    expect(row(2).props.accessibilityLabel).toBe(
      'Interview, current stage, 30 Oct 2026, 7:30 pm. Status updated to Interview Scheduled',
    );
    expect(row(2).props.accessibilityState).toMatchObject({ selected: true });
    expect(row(4).props.accessibilityLabel).toBe('Offer & Joining, not reached');
    expect(row(4).props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('the terminal stage of a closed application is one spoken element with the sentence and the note', async () => {
    await show(rejected);
    const terminal = screen.getByTestId('vt.terminal');
    expect(terminal.props.accessible).toBe(true);
    expect(terminal.props.accessibilityLabel).toBe(
      'Application closed by recruiter. The position has been filled.',
    );
  });

  it('D32 round 2: the rail is continuous (2-pt gap at the nodes) and every non-last row is at least 48 pt', async () => {
    await show(interviewVirtual);
    for (let i = 0; i < 4; i++) {
      const rail = flat(screen.getByTestId(`vt.rail.${i}`).props.style);
      expect(rail.marginVertical).toBe(2);
      expect(rail.width).toBe(2);
      expect(flat(screen.getByTestId(`vt.row.${i}`).props.style).minHeight).toBe(48);
    }
    expect(screen.queryByTestId('vt.rail.4')).not.toBeOnTheScreen();
  });

  it('shows the dates the data has: applied on, interview, joining', async () => {
    await show(interviewVirtual);
    expect(screen.getByText('21 Oct 2026')).toBeOnTheScreen();
    expect(screen.getByText('30 Oct 2026, 7:30 pm')).toBeOnTheScreen();
    await show(joiningConfirmed);
    expect(screen.getByText('Joining 26 Nov 2026')).toBeOnTheScreen();
  });

  it('a rejection stops the rail at a red closed node with the website sentence and the hospital note', async () => {
    await show(rejected);
    expect(screen.getByText('Application closed by recruiter')).toBeOnTheScreen();
    expect(screen.getByText('The position has been filled.')).toBeOnTheScreen();
    expect(screen.getByTestId('vt.terminal')).toBeOnTheScreen();
    expect(screen.queryByTestId('vt.row.2')).not.toBeOnTheScreen();
  });
});

describe('ApplicationCard', () => {
  const render = (row: unknown, onPress = jest.fn()) =>
    renderWithProviders(<ApplicationCard application={parse(row)} onPress={onPress} />);

  it('shows role, hospital · city, applied date in India format, status, steps and the last update', async () => {
    await render(applied);
    expect(screen.getByText('ICU Nurse')).toBeOnTheScreen();
    expect(screen.getByText('Seed City Multispeciality Hospital · Kolkata')).toBeOnTheScreen();
    expect(screen.getByText('Applied 25 Oct 2026')).toBeOnTheScreen();
    // R3 a11y P2-8: the applied line may wrap (it was cut through the date at large text).
    expect(screen.getByText('Applied 25 Oct 2026').props.numberOfLines).toBeUndefined();
    expect(screen.getByLabelText('Status: Applied')).toBeOnTheScreen();
    expect(screen.getByLabelText('Progress: step 1 of 5, Applied')).toBeOnTheScreen();
    expect(screen.getByText('Step 1 of 5')).toBeOnTheScreen();
    expect(screen.getByText('Application received by hospital')).toBeOnTheScreen();
  });

  it('says the status once: no "Status updated to X" under the X pill (D32 round 2)', async () => {
    await render(interviewVirtual);
    expect(screen.getByLabelText('Status: Interview Scheduled')).toBeOnTheScreen();
    expect(screen.queryByText('Status updated to Interview Scheduled')).not.toBeOnTheScreen();
    expect(screen.queryByText(/· Interview$/)).not.toBeOnTheScreen();
  });

  it('a closed job says it once (the bar sentence), not twice', async () => {
    await render({ ...applied, status: 'JobClosed' });
    expect(
      screen.getByText(
        'This job posting has been closed. You are no longer in the active pipeline for this role.',
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByText('This job posting has been closed by the recruiter')).not.toBeOnTheScreen();
  });

  it('the whole card opens the application, and says what it is for a screen reader', async () => {
    const onPress = jest.fn();
    await render(offerSent, onPress);
    const card = screen.getByTestId(`application.row.${offerSent.id}`);
    expect(card.props.accessibilityRole).toBe('button');
    // R3 a11y P2-13: names the action and the applied date (was "Action needed." with no word on what).
    expect(card.props.accessibilityLabel).toBe(
      'Anaesthetist at Seed Valley Care Centre, Offer Sent. Offer letter received: accept or reject. Applied 13 Oct 2026.',
    );
    await fireEvent.press(card);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('says what needs an answer in an action row at the bottom of the card (D32)', async () => {
    await render(interviewVirtual);
    expect(screen.getByText('Respond to your interview invitation')).toBeOnTheScreen();
    const row = screen.getByTestId(`application.row.${interviewVirtual.id}.action`);
    expect(flat(row.props.style).backgroundColor).toBe(colors.amberSoft);
    expect(screen.getByTestId(`application.row.${interviewVirtual.id}.action.chevron`)).toBeOnTheScreen();
  });

  it('has no action row when nothing is waiting on the candidate', async () => {
    await render(applied);
    expect(screen.queryByTestId(`application.row.${applied.id}.action`)).not.toBeOnTheScreen();
  });

  it.each([
    [documentsRequested, 'Documents requested: upload them'],
    [offerSent, 'Offer letter received: accept or reject'],
  ])('action hint %#', async (row, hint) => {
    await render(row);
    expect(screen.getByText(hint)).toBeOnTheScreen();
  });

  it('has no action hint when nothing is waiting on the candidate', async () => {
    await render(rejected);
    expect(screen.queryByText(/Action needed|Respond|requested:|received:/)).not.toBeOnTheScreen();
  });

  it('a joining date is shown', async () => {
    await render(joiningConfirmed);
    expect(screen.getByText('Joining on 26 Nov 2026')).toBeOnTheScreen();
  });

  it('uses the location when the job has no city', async () => {
    await render({
      ...applied,
      job: { ...(applied.job as object), city: null, location: 'Pune, Maharashtra' },
    });
    expect(screen.getByText('Seed City Multispeciality Hospital · Pune, Maharashtra')).toBeOnTheScreen();
  });
});
