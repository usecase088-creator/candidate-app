import { onlineManager } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import * as Network from 'expo-network';
import { act, fireEvent, renderRouter, screen, waitFor, within } from 'expo-router/testing-library';
import * as WebBrowser from 'expo-web-browser';
import { delay, http, HttpResponse } from 'msw';

import { appRoutes } from '@/test/appRoutes';
import { govJob, intlJob } from '@/test/fixtures/jobs';
import { API } from '@/test/msw/handlers';
import { installJobsBackend } from '@/test/msw/jobs';
import { server } from '@/test/msw/server';
import { resetAppState, startSignedIn } from '@/test/startSignedIn';

import { formatDate } from '../logic/deadline';

jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: jest.fn() }));
jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn(() => Promise.resolve()),
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(() => Promise.resolve({ type: 'cancel' })),
}));

const DAY = 24 * 60 * 60 * 1000;
const inDays = (n: number) => new Date(Date.now() + n * DAY).toISOString();

const aiims = {
  ...govJob,
  id: 'g1',
  examAuthority: 'AIIMS',
  name: 'Nursing Officer Recruitment',
  lastDate: inDays(30),
};
const upsc = {
  ...govJob,
  id: 'g2',
  examAuthority: 'UPSC',
  name: 'Medical Officer',
  lastDate: inDays(3),
  link: 'https://upsc.gov.in/x',
};
const old = {
  ...govJob,
  id: 'g3',
  examAuthority: 'State PSC',
  name: 'Staff Nurse Exam',
  lastDate: inDays(-5),
};
const open = { ...govJob, id: 'g4', examAuthority: 'ESIC', name: 'Specialist', lastDate: null };

const uk = { ...intlJob, id: 'i1', lastDate: inDays(40) };
const uae = {
  ...intlJob,
  id: 'i2',
  jobPosition: 'Pharmacist',
  specialty: 'Retail',
  city: 'Dubai',
  country: 'UAE',
  countryFlag: '🇦🇪',
  payscale: 'AED 8k',
  qualification: 'B.Pharm',
  license: 'DHA',
  visaSponsorship: 'Employer',
  applyLink: 'https://uae.example/apply',
  lastDate: inDays(2),
};
const expiredIntl = {
  ...intlJob,
  id: 'i3',
  jobPosition: 'Old role',
  country: 'Ireland',
  countryFlag: '🇮🇪',
  lastDate: inDays(-9),
};

beforeEach(() => {
  resetAppState();
  jest.mocked(useFonts).mockReturnValue([true, null]);
  jest.mocked(WebBrowser.openBrowserAsync).mockClear();
});
afterEach(() => {
  jest
    .mocked(Network.getNetworkStateAsync)
    .mockResolvedValue({ isConnected: true, isInternetReachable: true } as never);
  onlineManager.setOnline(true);
});

describe('Government jobs', () => {
  const gov = () => startSignedIn('/gov-jobs', 'gov.screen');

  it('hero, stats and a card per listing', async () => {
    installJobsBackend({ gov: [aiims, upsc, old, open] });
    await gov();
    expect(await screen.findByRole('header', { name: '🏛️ Government Jobs & Exams' })).toBeOnTheScreen();
    expect(screen.getByText('Latest notifications — AIIMS, UPSC, State PSC, and more.')).toBeOnTheScreen();
    await screen.findByTestId('gov.card.g1');
    const stats = within(screen.getByTestId('gov.stats'));
    expect(stats.getByText('Total Listings')).toBeOnTheScreen();
    expect(stats.getByTestId('gov.stat.total')).toHaveTextContent('4');
    expect(stats.getByTestId('gov.stat.deadline')).toHaveTextContent('3');
    expect(stats.getByText('With Deadline')).toBeOnTheScreen();
    expect(stats.getByTestId('gov.stat.open')).toHaveTextContent('1');
    expect(stats.getByText('Open-ended')).toBeOnTheScreen();
    expect(screen.getByTestId('gov.footer')).toHaveTextContent(
      'Showing 4 of 4 government listings · Managed by ApronHanger',
    );
  });

  it('a card shows authority, name, deadline and "View / Apply"', async () => {
    installJobsBackend({ gov: [aiims] });
    await gov();
    const card = within(await screen.findByTestId('gov.card.g1'));
    expect(card.getByText('AIIMS')).toBeOnTheScreen();
    expect(card.getByText('Nursing Officer Recruitment')).toBeOnTheScreen();
    expect(card.getByText(formatDate(aiims.lastDate))).toBeOnTheScreen();
    expect(card.getByRole('button', { name: 'View / Apply, AIIMS' })).toBeOnTheScreen();
  });

  it('deadline: 7 days or fewer shows "{n}d left", past shows "Expired · date", none shows "No deadline"', async () => {
    installJobsBackend({ gov: [upsc, old, open] });
    await gov();
    expect(within(await screen.findByTestId('gov.card.g2')).getByText('3d left')).toBeOnTheScreen();
    expect(
      within(screen.getByTestId('gov.card.g3')).getByText(`Expired · ${formatDate(old.lastDate)}`),
    ).toBeOnTheScreen();
    expect(within(screen.getByTestId('gov.card.g4')).getByText('No deadline')).toBeOnTheScreen();
  });

  it('"View / Apply" opens the link in the in-app browser', async () => {
    installJobsBackend({ gov: [upsc] });
    await gov();
    await fireEvent.press(await screen.findByTestId('gov.apply.g2'));
    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith('https://upsc.gov.in/x');
  });

  it('an expired listing cannot be opened', async () => {
    installJobsBackend({ gov: [old] });
    await gov();
    const button = await screen.findByTestId('gov.apply.g3');
    expect(button).toBeDisabled();
    await fireEvent.press(button);
    expect(WebBrowser.openBrowserAsync).not.toHaveBeenCalled();
  });

  it('a link that is not http(s) is never opened', async () => {
    installJobsBackend({ gov: [{ ...aiims, link: 'javascript:alert(1)' }] });
    await gov();
    await fireEvent.press(await screen.findByTestId('gov.apply.g1'));
    expect(WebBrowser.openBrowserAsync).not.toHaveBeenCalled();
    expect(await screen.findByText("This link can't be opened.")).toBeOnTheScreen();
  });

  it('search by authority or name, lower-case; "No listings match your search."', async () => {
    installJobsBackend({ gov: [aiims, upsc] });
    await gov();
    await screen.findByTestId('gov.card.g1');
    await fireEvent.changeText(screen.getByTestId('gov.search'), 'aIiMs');
    expect(screen.queryByTestId('gov.card.g2')).not.toBeOnTheScreen();
    expect(screen.getByTestId('gov.footer')).toHaveTextContent(
      'Showing 1 of 2 government listings · Managed by ApronHanger',
    );
    await fireEvent.changeText(screen.getByTestId('gov.search'), 'medical');
    expect(screen.getByTestId('gov.card.g2')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByTestId('gov.search'), 'zzz');
    expect(await screen.findByText('No listings match your search.')).toBeOnTheScreen();
  });

  it('search placeholder is the website text', async () => {
    installJobsBackend({ gov: [aiims] });
    await gov();
    expect(screen.getByTestId('gov.search').props.placeholder).toBe('Search by authority or exam name…');
  });

  it('empty: "No government jobs yet"', async () => {
    installJobsBackend({ gov: [] });
    await gov();
    expect(await screen.findByText('No government jobs yet')).toBeOnTheScreen();
    expect(screen.getByText('Check back soon for new listings.')).toBeOnTheScreen();
    expect(screen.queryByTestId('gov.stats')).not.toBeOnTheScreen();
  });

  it('loading: "Loading government jobs…" with skeletons', async () => {
    installJobsBackend({ gov: [aiims] });
    server.use(
      http.get(`${API}/api/gov-jobs`, async () => {
        await delay(200);
        return HttpResponse.json([aiims]);
      }),
    );
    await gov();
    expect(screen.getByTestId('gov.loading')).toBeOnTheScreen();
    expect(screen.getByText('Loading government jobs…')).toBeOnTheScreen();
    expect(await screen.findByTestId('gov.card.g1')).toBeOnTheScreen();
  });

  it('error: Try Again, not "No government jobs yet"', async () => {
    installJobsBackend({ gov: [aiims] });
    let fail = true;
    server.use(
      http.get(`${API}/api/gov-jobs`, () =>
        fail ? HttpResponse.json({ error: 'x' }, { status: 500 }) : HttpResponse.json([aiims]),
      ),
    );
    await gov();
    expect(await screen.findByTestId('gov.error')).toBeOnTheScreen();
    expect(screen.queryByText('No government jobs yet')).not.toBeOnTheScreen();
    fail = false;
    await fireEvent.press(screen.getByTestId('gov.error.retry'));
    expect(await screen.findByTestId('gov.card.g1')).toBeOnTheScreen();
  });

  it('offline before loading: offline message', async () => {
    installJobsBackend({ gov: [aiims] });
    jest
      .mocked(Network.getNetworkStateAsync)
      .mockResolvedValue({ isConnected: false, isInternetReachable: false } as never);
    await gov();
    expect(await screen.findByTestId('gov.offline')).toBeOnTheScreen();
    await act(async () => onlineManager.setOnline(true));
    await fireEvent.press(screen.getByTestId('gov.offline.retry'));
    expect(await screen.findByTestId('gov.card.g1')).toBeOnTheScreen();
  });

  it('Back goes Home on a deep link', async () => {
    installJobsBackend({ gov: [aiims] });
    const app = await gov();
    await fireEvent.press(await screen.findByRole('button', { name: 'Back to opportunities' }));
    await waitFor(() => expect(app.getPathname()).toBe('/'));
  });

  it('signed out: goes to login', async () => {
    await renderRouter(appRoutes, { initialUrl: '/gov-jobs' });
    expect(await screen.findByTestId('login.screen')).toBeOnTheScreen();
  });
});

describe('International jobs', () => {
  const intl = () => startSignedIn('/intl-jobs', 'intl.screen');

  it('hero, stats, country chips and a card per listing', async () => {
    installJobsBackend({ intl: [uk, uae, expiredIntl] });
    await intl();
    expect(await screen.findByRole('header', { name: '🌍 International Healthcare Jobs' })).toBeOnTheScreen();
    expect(
      screen.getByText('Verified international listings — salary disclosed, visa status included.'),
    ).toBeOnTheScreen();
    await screen.findByTestId('intl.card.i1');
    const stats = within(screen.getByTestId('intl.stats'));
    expect(stats.getByTestId('intl.stat.total')).toHaveTextContent('3');
    expect(stats.getByText('Countries')).toBeOnTheScreen();
    expect(stats.getByTestId('intl.stat.countries')).toHaveTextContent('3');
    expect(stats.getByText('With Sponsorship')).toBeOnTheScreen();
    expect(stats.getByTestId('intl.stat.sponsorship')).toHaveTextContent('2'); // i1 and i3
    expect(screen.getByTestId('intl.footer')).toHaveTextContent(
      'Showing 3 of 3 international listings · Managed by ApronHanger',
    );
    for (const c of ['All', 'Ireland', 'UAE', 'United Kingdom']) {
      expect(screen.getByTestId(`intl.country.${c}`)).toBeOnTheScreen();
    }
    expect(screen.getByText('🌍 All')).toBeOnTheScreen();
    expect(within(screen.getByTestId('intl.country.UAE')).getByText('🇦🇪 UAE')).toBeOnTheScreen();
  });

  it('a card shows every website column', async () => {
    installJobsBackend({ intl: [uae] });
    await intl();
    const card = within(await screen.findByTestId('intl.card.i2'));
    for (const text of [
      'Pharmacist',
      'Retail',
      'Dubai',
      '🇦🇪 UAE',
      'AED 8k',
      '2+ yrs',
      'B.Pharm',
      'DHA',
      'Employer',
      '2d left',
    ]) {
      expect(card.getByText(text)).toBeOnTheScreen();
    }
    for (const label of [
      'Specialty',
      'City',
      'Country',
      'Pay Scale',
      'Experience',
      'Qualification',
      'License',
      'Visa',
      'Last Date',
    ]) {
      expect(card.getByText(label)).toBeOnTheScreen();
    }
    expect(card.getByRole('button', { name: 'Apply, Pharmacist' })).toBeOnTheScreen();
  });

  it('a missing pay scale shows a dash', async () => {
    installJobsBackend({ intl: [{ ...uk, payscale: '' }] });
    await intl();
    expect(
      within(await screen.findByTestId('intl.card.i1')).getByTestId('intl.payscale.i1'),
    ).toHaveTextContent('—');
  });

  it('the visa badge uses the website colours', async () => {
    installJobsBackend({ intl: [uk] });
    await intl();
    const badge = await screen.findByTestId('intl.visa.i1');
    expect(badge).toHaveStyle({ backgroundColor: '#dcfce7' });
  });

  it('country chip filters; "All" shows everything again', async () => {
    installJobsBackend({ intl: [uk, uae, expiredIntl] });
    await intl();
    await screen.findByTestId('intl.card.i1');
    await fireEvent.press(screen.getByTestId('intl.country.UAE'));
    expect(screen.queryByTestId('intl.card.i1')).not.toBeOnTheScreen();
    expect(screen.getByTestId('intl.card.i2')).toBeOnTheScreen();
    expect(screen.getByTestId('intl.footer')).toHaveTextContent(
      'Showing 1 of 3 international listings · Managed by ApronHanger',
    );
    await fireEvent.press(screen.getByTestId('intl.country.All'));
    expect(screen.getByTestId('intl.card.i1')).toBeOnTheScreen();
  });

  it('search by role, specialty, city, country, qualification or licence', async () => {
    installJobsBackend({ intl: [uk, uae] });
    await intl();
    await screen.findByTestId('intl.card.i1');
    expect(screen.getByTestId('intl.search').props.placeholder).toBe('Search by role, specialty, city…');
    await fireEvent.changeText(screen.getByTestId('intl.search'), 'dha');
    expect(screen.queryByTestId('intl.card.i1')).not.toBeOnTheScreen();
    expect(screen.getByTestId('intl.card.i2')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByTestId('intl.search'), 'zzz');
    expect(
      await screen.findByText('No listings match your search. Try a different keyword or country.'),
    ).toBeOnTheScreen();
  });

  it('"Apply" opens the link in the in-app browser; expired ones are disabled', async () => {
    installJobsBackend({ intl: [uae, expiredIntl] });
    await intl();
    await fireEvent.press(await screen.findByTestId('intl.apply.i2'));
    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith('https://uae.example/apply');
    expect(screen.getByTestId('intl.apply.i3')).toBeDisabled();
    expect(
      within(screen.getByTestId('intl.card.i3')).getByText(`Expired · ${formatDate(expiredIntl.lastDate)}`),
    ).toBeOnTheScreen();
  });

  it('empty: "No international jobs yet"', async () => {
    installJobsBackend({ intl: [] });
    await intl();
    expect(await screen.findByText('No international jobs yet')).toBeOnTheScreen();
    expect(
      screen.getByText('International listings are posted by our team. Check back soon.'),
    ).toBeOnTheScreen();
  });

  it('loading, error and offline', async () => {
    installJobsBackend({ intl: [uk] });
    server.use(
      http.get(`${API}/api/intl-jobs`, async () => {
        await delay(200);
        return HttpResponse.json([uk]);
      }),
    );
    await intl();
    expect(screen.getByTestId('intl.loading')).toBeOnTheScreen();
    expect(screen.getByText('Loading international jobs…')).toBeOnTheScreen();
    expect(await screen.findByTestId('intl.card.i1')).toBeOnTheScreen();
  });

  it('error: Try Again', async () => {
    installJobsBackend({ intl: [uk] });
    let fail = true;
    server.use(
      http.get(`${API}/api/intl-jobs`, () =>
        fail ? HttpResponse.json({ error: 'x' }, { status: 500 }) : HttpResponse.json([uk]),
      ),
    );
    await intl();
    expect(await screen.findByTestId('intl.error')).toBeOnTheScreen();
    fail = false;
    await fireEvent.press(screen.getByTestId('intl.error.retry'));
    expect(await screen.findByTestId('intl.card.i1')).toBeOnTheScreen();
  });

  it('offline before loading: offline message', async () => {
    installJobsBackend({ intl: [uk] });
    jest
      .mocked(Network.getNetworkStateAsync)
      .mockResolvedValue({ isConnected: false, isInternetReachable: false } as never);
    await intl();
    expect(await screen.findByTestId('intl.offline')).toBeOnTheScreen();
  });

  it('signed out: goes to login', async () => {
    await renderRouter(appRoutes, { initialUrl: '/intl-jobs' });
    expect(await screen.findByTestId('login.screen')).toBeOnTheScreen();
  });
});
