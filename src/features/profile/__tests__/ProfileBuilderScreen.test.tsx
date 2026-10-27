import { useFonts } from 'expo-font';
import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { http, HttpResponse } from 'msw';

import { secureStorage } from '@/lib/secureStorage';
import { applicantMe } from '@/test/fixtures/applications';
import { API } from '@/test/msw/handlers';
import { installJobsBackend } from '@/test/msw/jobs';
import { server } from '@/test/msw/server';
import { resetAppState, startSignedIn } from '@/test/startSignedIn';

import { BUILDER_STEP_KEY } from '../builder/useBuilderStep';

jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: jest.fn() }));
jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn(() => Promise.resolve()),
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
}));

const DOCTOR =
  'Clinical Practitioners & Super Specialists (MBBS/ MD Physician/ MD/MS / DM / MCh / DNB-SS etc)';

// A saved profile that passes every step, so tests can walk through.
const fullProfile = {
  ...applicantMe.profile,
  someOtherKey: 'keep me',
  role: DOCTOR,
  specialty: 'Cardiology',
  state: 'West Bengal',
  registrationCouncil: 'NMC',
  registrationNumber: 'WB/1',
  licenseStatus: 'Active',
  qualifications: [{ degree: 'MBBS', institution: 'CMC', year: '2012' }],
  experience: [
    {
      role: 'Consultant',
      hospital: 'AMRI',
      city: 'Kolkata',
      start: '2020-01-01',
      end: '',
      current: true,
      specialty: 'Cardiology',
      summary: '',
    },
  ],
  clinicalSkills: ['PTCA'],
  summary: 'Consultant cardiologist with seven years of tertiary-care experience.',
};
const meWith = (profile: unknown, over: Record<string, unknown> = {}) => ({
  ...applicantMe,
  profile,
  ...over,
});

let puts: { profile: Record<string, unknown> }[];
function setup(me: unknown = meWith(fullProfile)) {
  puts = [];
  installJobsBackend({ me });
  server.use(
    http.put(`${API}/api/candidates/me`, async ({ request }) => {
      const body = (await request.json()) as { profile: Record<string, unknown> };
      puts.push(body);
      return HttpResponse.json({ ...(me as object), profile: body.profile });
    }),
  );
}
const open = () => startSignedIn('/profile-builder', 'builder.screen');
const next = async () => fireEvent.press(await screen.findByTestId('builder.next'));

beforeEach(() => {
  resetAppState();
  jest.mocked(useFonts).mockReturnValue([true, null]);
});

describe('Profile builder: first step', () => {
  it('starts at step 1 of 16 with the saved details, and shows the sign-in email and phone read-only', async () => {
    setup();
    await open();
    expect(await screen.findByTestId('builder.progress')).toHaveTextContent('Step 1 of 16');
    expect(screen.getByText('Basic Details')).toBeOnTheScreen();
    expect(screen.getByTestId('builder.field.fullName')).toHaveProp('value', 'Demo Applicant');
    expect(screen.getByTestId('builder.field.email')).toHaveTextContent('applicant@apronhanger.test');
    expect(screen.getByTestId('builder.field.phone')).toHaveTextContent('9876500088');
    expect(screen.queryByTestId('builder.back')).toBeNull();
  });

  it('shows the website message and saves nothing when the step is not valid', async () => {
    setup();
    await open();
    await fireEvent.changeText(await screen.findByTestId('builder.field.fullName'), '   ');
    await next();
    expect(await screen.findByText('Full name is required')).toBeOnTheScreen();
    expect(puts).toHaveLength(0);
  });

  it('saves the profile for the step, goes to step 2, and never changes the sign-in phone or email (B8)', async () => {
    setup(meWith({ ...fullProfile, phone: '9222222222', email: 'other@x.test' }));
    await open();
    await fireEvent.changeText(await screen.findByTestId('builder.field.fullName'), 'Dr. New Name');
    await next();
    await waitFor(() => expect(puts).toHaveLength(1));
    const sent = puts[0]!.profile;
    expect(sent.name).toBe('Dr. New Name');
    expect(sent.phone).toBe('9876500088');
    expect(sent.email).toBe('applicant@apronhanger.test');
    expect(sent.someOtherKey).toBe('keep me');
    expect(await screen.findByTestId('builder.progress')).toHaveTextContent('Step 2 of 16');
    expect(await secureStorage.getItem(BUILDER_STEP_KEY)).toBe('1');
  });

  it('stays on the step and says so when the save fails', async () => {
    setup();
    server.use(
      http.put(`${API}/api/candidates/me`, () => HttpResponse.json({ error: 'x' }, { status: 500 })),
    );
    await open();
    await next();
    expect(await screen.findByTestId('builder.error')).toHaveTextContent('Failed to save profile');
    expect(screen.getByTestId('builder.progress')).toHaveTextContent('Step 1 of 16');
  });
});

describe('Profile builder: moving around', () => {
  it('goes back without saving', async () => {
    setup();
    await secureStorage.setItem(BUILDER_STEP_KEY, '2');
    await open();
    expect(await screen.findByTestId('builder.progress')).toHaveTextContent('Step 3 of 16');
    await fireEvent.press(screen.getByTestId('builder.back'));
    expect(await screen.findByTestId('builder.progress')).toHaveTextContent('Step 2 of 16');
    expect(puts).toHaveLength(0);
  });

  it('resumes at the step where the user stopped', async () => {
    setup();
    await secureStorage.setItem(BUILDER_STEP_KEY, '5');
    await open();
    expect(await screen.findByText('Clinical Skills')).toBeOnTheScreen();
  });

  it('shows required rules by role: a doctor cannot leave the step without a specialty', async () => {
    setup(meWith({ ...fullProfile, specialty: '' }));
    await secureStorage.setItem(BUILDER_STEP_KEY, '1');
    await open();
    await next();
    expect(await screen.findByText('Primary specialty is required')).toBeOnTheScreen();
  });

  it('adds a qualification row and checks it', async () => {
    setup(meWith({ ...fullProfile, qualifications: [] }));
    await secureStorage.setItem(BUILDER_STEP_KEY, '3');
    await open();
    await next();
    expect(await screen.findByText('Add at least one qualification')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('builder.qualifications.add'));
    await next();
    expect(await screen.findByText('Qualification 1: degree is required')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByTestId('builder.qualifications.0.degree'), 'MBBS');
    await fireEvent.changeText(screen.getByTestId('builder.qualifications.0.institution'), 'CMC');
    await fireEvent.changeText(screen.getByTestId('builder.qualifications.0.year'), '2012');
    await next();
    await waitFor(() => expect(puts).toHaveLength(1));
    expect(puts[0]!.profile.qualifications).toEqual([{ degree: 'MBBS', institution: 'CMC', year: '2012' }]);
  });

  it('removes a row', async () => {
    setup();
    await secureStorage.setItem(BUILDER_STEP_KEY, '3');
    await open();
    await fireEvent.press(await screen.findByTestId('builder.qualifications.0.remove'));
    expect(screen.queryByTestId('builder.qualifications.0.degree')).toBeNull();
  });

  it('adds a chip to a list field', async () => {
    setup();
    await secureStorage.setItem(BUILDER_STEP_KEY, '5');
    await open();
    await fireEvent.changeText(await screen.findByTestId('builder.field.clinicalSkills.input'), 'Echo');
    await fireEvent.press(screen.getByTestId('builder.field.clinicalSkills.add'));
    await next();
    await waitFor(() => expect(puts).toHaveLength(1));
    expect(puts[0]!.profile.clinicalSkills).toEqual(['PTCA', 'Echo']);
  });
});

describe('Profile builder: review', () => {
  it('shows a summary and saves the whole profile, then returns to the Profile tab', async () => {
    setup();
    await secureStorage.setItem(BUILDER_STEP_KEY, '15');
    await open();
    expect(await screen.findByTestId('builder.progress')).toHaveTextContent('Step 16 of 16');
    expect(screen.getByTestId('builder.review.name')).toHaveTextContent('Demo Applicant');
    await fireEvent.press(screen.getByTestId('builder.submit'));
    await waitFor(() => expect(puts).toHaveLength(1));
    expect(await screen.findByTestId('profile.screen')).toBeOnTheScreen();
    expect(await secureStorage.getItem(BUILDER_STEP_KEY)).toBeNull();
  });

  it('sends the user back to the first step that is not valid', async () => {
    setup(meWith({ ...fullProfile, clinicalSkills: [] }));
    await secureStorage.setItem(BUILDER_STEP_KEY, '15');
    await open();
    await fireEvent.press(await screen.findByTestId('builder.submit'));
    expect(await screen.findByText('Add at least one clinical skill')).toBeOnTheScreen();
    expect(screen.getByTestId('builder.progress')).toHaveTextContent('Step 6 of 16');
    expect(puts).toHaveLength(0);
  });
});

describe('Profile builder: no profile yet', () => {
  it('starts empty with the account name, email and phone', async () => {
    setup(meWith(null, { cvSource: null }));
    await open();
    expect(await screen.findByTestId('builder.field.fullName')).toHaveProp('value', 'Demo Applicant');
    expect(screen.getByTestId('builder.field.email')).toHaveTextContent('applicant@apronhanger.test');
  });
});
