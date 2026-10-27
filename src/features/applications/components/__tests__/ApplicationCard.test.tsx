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
import { fireEvent, renderWithProviders, screen } from '@/test/render';

import { ApplicationCard } from '../ApplicationCard';
import { StatusPill } from '../StatusPill';
import { Timeline } from '../Timeline';

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

  it('uses the website colour group: indigo interview, amber documents, green offer, red closed', async () => {
    const tones: [string, string, string][] = [
      ['InterviewScheduled', colors.indigoSoft, colors.indigoText],
      ['DocumentsRequested', colors.amberSoft, colors.amberText],
      ['OfferSent', colors.emeraldSoft, colors.emeraldText],
      ['Reviewed', colors.skySoft, colors.skyText],
      ['Rejected', colors.destructiveSoft, colors.errorText],
    ];
    for (const [status, bg, fg] of tones) {
      const { unmount } = await renderWithProviders(<StatusPill testID="p" status={status} />);
      expect(flat(screen.getByTestId('p').props.style).backgroundColor).toBe(bg);
      expect(flat(screen.getByText(/./).props.style).color).toBe(fg);
      await unmount();
    }
  });

  it('is announced as the status', async () => {
    await renderWithProviders(<StatusPill testID="p" status="OfferSent" />);
    expect(screen.getByLabelText('Status: Offer Sent')).toBeOnTheScreen();
  });
});

describe('Timeline', () => {
  it('shows the five steps with the current one named, and says it in words for screen readers', async () => {
    await renderWithProviders(<Timeline testID="t" status="DocumentsRequested" />);
    expect(screen.getByLabelText('Progress: step 4 of 5, Documents')).toBeOnTheScreen();
    expect(screen.getByText('Documents')).toBeOnTheScreen();
    for (let i = 0; i < 5; i++) expect(screen.getByTestId(`t.step.${i}`)).toBeOnTheScreen();
    expect(screen.getByTestId('t.step.3').props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByTestId('t.step.4').props.accessibilityState).toMatchObject({ selected: false });
  });

  it('a rejection shows the website sentence instead of the steps', async () => {
    await renderWithProviders(<Timeline testID="t" status="Rejected" />);
    expect(screen.getByText('Application closed by recruiter')).toBeOnTheScreen();
    expect(screen.queryByTestId('t.step.0')).not.toBeOnTheScreen();
  });

  it('a closed job shows the closed sentence', async () => {
    await renderWithProviders(<Timeline testID="t" status="JobClosed" />);
    expect(
      screen.getByText(
        'This job posting has been closed. You are no longer in the active pipeline for this role.',
      ),
    ).toBeOnTheScreen();
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
    expect(screen.getByLabelText('Status: Applied')).toBeOnTheScreen();
    expect(screen.getByLabelText('Progress: step 1 of 5, Applied')).toBeOnTheScreen();
    expect(screen.getByText('Application received by hospital')).toBeOnTheScreen();
  });

  it('the whole card opens the application, and says what it is for a screen reader', async () => {
    const onPress = jest.fn();
    await render(offerSent, onPress);
    const card = screen.getByTestId(`application.row.${offerSent.id}`);
    expect(card.props.accessibilityRole).toBe('button');
    expect(card.props.accessibilityLabel).toBe(
      'Anaesthetist at Seed Valley Care Centre, Offer Sent. Action needed.',
    );
    await fireEvent.press(card);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('says what needs an answer: interview, documents, offer', async () => {
    await render(interviewVirtual);
    expect(screen.getByText('Respond to your interview invitation')).toBeOnTheScreen();
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
