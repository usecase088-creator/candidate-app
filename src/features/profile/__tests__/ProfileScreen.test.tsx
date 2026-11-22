import { useFonts } from 'expo-font';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import { Alert, StyleSheet } from 'react-native';
import { fireEvent, screen, waitFor, within } from 'expo-router/testing-library';
import { http, HttpResponse } from 'msw';

import { applicantMe } from '@/test/fixtures/applications';
import { API } from '@/test/msw/handlers';
import { installJobsBackend } from '@/test/msw/jobs';
import { server } from '@/test/msw/server';
import { installXhrOverFetch } from '@/test/xhrOverFetch';
import { resetAppState, startSignedIn } from '@/test/startSignedIn';
import { colors, radius, shadows } from '@/theme/tokens';

jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: jest.fn() }));
jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn(() => Promise.resolve()),
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
}));
jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(() => Promise.resolve({ type: 'cancel' })),
}));

let restoreXhr: () => void;
beforeAll(() => {
  restoreXhr = installXhrOverFetch();
});
afterAll(() => restoreXhr());
/**
 * The Profile tab: start the app and wait until the `me` query has landed. The grouped rows (profile.edit,
 * profile.settings ...) are already on screen while it loads, so a find* on them alone races the query.
 */
async function openProfile() {
  await startSignedIn('/profile', 'profile.screen');
  await screen.findByTestId('profile.strength');
}

beforeEach(() => {
  resetAppState();
  jest.mocked(useFonts).mockReturnValue([true, null]);
  jest.mocked(WebBrowser.openBrowserAsync).mockClear();
});

describe('Profile tab', () => {
  it('shows the candidate name, email and profile completeness', async () => {
    installJobsBackend({ me: applicantMe });
    await openProfile();
    expect(await screen.findByTestId('profile.name')).toHaveTextContent('Demo Applicant');
    expect(screen.getByTestId('profile.email')).toHaveTextContent('applicant@apronhanger.test');
    expect(screen.getByTestId('profile.completeness')).toHaveTextContent(/94%/);
    // D32: the number sits inside a ring; screen readers still hear the full website sentence.
    expect(screen.getByTestId('profile.completeness')).toHaveProp(
      'accessibilityLabel',
      'Profile completeness: 94%',
    );
  });

  it('D32 R2 (issue 13): the strength card is the app card: white, radius 12, soft shadow, no hairline border', async () => {
    installJobsBackend({ me: applicantMe });
    await openProfile();
    const style = StyleSheet.flatten(screen.getByTestId('profile.strength').props.style);
    expect(style).toMatchObject({
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      boxShadow: shadows.soft,
    });
    expect(style.borderWidth ?? 0).toBe(0);
  });

  it('D32: lists up to three next best fixes under the ring, each opening the builder', async () => {
    installJobsBackend({ me: applicantMe });
    await openProfile();
    expect(await screen.findByTestId('profile.fixes')).toBeOnTheScreen();
    expect(screen.getByTestId('profile.fixes.0')).toHaveTextContent('Add your registration number');
    expect(screen.getByTestId('profile.fixes.2')).toBeOnTheScreen();
    expect(screen.queryByTestId('profile.fixes.3')).toBeNull();
    await fireEvent.press(screen.getByTestId('profile.fixes.0'));
    expect(await screen.findByTestId('builder.screen')).toBeOnTheScreen();
  });

  it('D32: Edit profile, My CV, Settings and Sign out are grouped rows once the profile exists', async () => {
    installJobsBackend({ me: applicantMe });
    await openProfile();
    expect(await screen.findByTestId('profile.group.profile')).toBeOnTheScreen();
    expect(screen.getByTestId('profile.edit')).toHaveTextContent('Edit profile');
    expect(screen.getByTestId('profile.cv')).toHaveTextContent('My CV');
    expect(screen.getByTestId('profile.group.account')).toBeOnTheScreen();
    expect(screen.getByTestId('profile.settings')).toHaveTextContent('Settings');
    expect(screen.getByTestId('profile.signout')).toHaveTextContent('Sign out');
  });

  it('M4: with no profile yet it shows the website empty state with one "Build my CV" button and no fixes list', async () => {
    installJobsBackend({ me: { ...applicantMe, profile: null } });
    await startSignedIn('/profile', 'profile.screen');
    expect(await screen.findByTestId('profile.empty')).toBeOnTheScreen();
    expect(screen.getByText("Your CV hasn't been built yet")).toBeOnTheScreen();
    expect(
      screen.getByText(
        "ApronHanger builds your professional CV from a single structured form. Once it's done, you can Quick Apply to any verified role with one tap.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('profile.edit')).toHaveTextContent('Build my CV');
    expect(screen.queryByTestId('profile.fixes')).toBeNull();
    expect(screen.queryByTestId('profile.sections')).toBeNull();
    await fireEvent.press(screen.getByTestId('profile.edit'));
    expect(await screen.findByTestId('builder.screen')).toBeOnTheScreen();
  });

  it('shows Try Again when the profile cannot be loaded and still lets the user sign out', async () => {
    installJobsBackend({ me: applicantMe });
    server.use(
      http.get(`${API}/api/candidates/me`, () => HttpResponse.json({ error: 'x' }, { status: 500 })),
    );
    await startSignedIn('/profile', 'profile.screen');
    expect(await screen.findByTestId('profile.error')).toBeOnTheScreen();
    expect(screen.getByTestId('profile.signout')).toBeOnTheScreen();
  });
});

const DOCTOR =
  'Clinical Practitioners & Super Specialists (MBBS/ MD Physician/ MD/MS / DM / MCh / DNB-SS etc)';
const richMe = {
  ...applicantMe,
  supportingDocuments: [
    {
      name: 'licence.pdf',
      url: 'https://res.example.test/licence.pdf',
      publicId: 'docs/1',
      mime: 'application/pdf',
    },
    { name: '', url: 'javascript:alert(1)', publicId: 'docs/2', mime: null },
  ],
  profile: {
    ...applicantMe.profile,
    verified: true,
    role: DOCTOR,
    summary: 'Consultant physician with six years of tertiary-care experience.',
    experience: [
      {
        role: 'Consultant',
        hospital: 'AMRI',
        city: 'Kolkata',
        start: '2020-01-01',
        end: '',
        current: true,
        summary: 'Ran the OPD.',
      },
    ],
    qualifications: [{ degree: 'MBBS', institution: 'CMC Vellore', year: '2012' }],
    procedures: [
      { name: 'Central line', count: 1200 },
      { name: 'Intubation', count: 40 },
    ],
    certifications: [{ name: 'ACLS', issuer: 'AHA', year: '2021' }],
    publications: ['Sen A. Sepsis bundles. JAPI 2020'],
    registrationCouncil: 'West Bengal Medical Council',
    registrationNumber: 'WB/12345',
    availability: '30 days notice',
    availabilityStatus: 'Serving Notice Period',
    expectedSalaryMin: 20,
    expectedSalaryMax: 30,
    currentSalaryMin: 15,
    currentSalaryMax: 15,
  },
};

describe('Profile tab: website profile content', () => {
  it('shows every section the website shows, with its title', async () => {
    installJobsBackend({ me: richMe });
    await openProfile();
    const sections = within(await screen.findByTestId('profile.sections'));
    const titles: [string, string][] = [
      ['about', 'About'],
      ['experience', 'Experience'],
      ['education', 'Education'],
      ['procedures', 'Procedures & volume'],
      ['certifications', 'Licenses & certifications'],
      ['publications', 'Publications & research'],
      ['documents', 'Supporting Documents'],
      ['registration', 'Professional registration'],
      ['availability', 'Availability'],
      ['clinicalSkills', 'Clinical skills'],
      ['technicalSkills', 'Technical skills'],
      ['languages', 'Languages'],
    ];
    for (const [key, title] of titles) {
      expect(
        within(sections.getByTestId(`profile.section.${key}.header`)).getByText(title),
      ).toBeOnTheScreen();
    }
    expect(sections.getByTestId('profile.section.about')).toHaveTextContent(/six years of tertiary-care/);
    const job = sections.getByTestId('profile.section.experience.0');
    expect(job).toHaveTextContent(/Consultant/);
    expect(job).toHaveTextContent(/2020-01-01 — Present/);
    expect(job).toHaveTextContent(/AMRI · Kolkata/);
    expect(sections.getByTestId('profile.section.education.0')).toHaveTextContent(/MBBS.*CMC Vellore.*2012/);
    expect(sections.getByTestId('profile.section.procedures.0')).toHaveTextContent(/Central line.*1200/);
    expect(sections.getByTestId('profile.section.certifications.0')).toHaveTextContent(/ACLS.*AHA.*2021/);
    expect(sections.getByTestId('profile.section.publications.0')).toHaveTextContent(
      'Sen A. Sepsis bundles. JAPI 2020',
    );
    const registration = sections.getByTestId('profile.section.registration');
    expect(registration).toHaveTextContent(/Council.*West Bengal Medical Council/);
    expect(registration).toHaveTextContent(/Reg\. number.*WB\/12345/);
    const availability = sections.getByTestId('profile.section.availability');
    expect(availability).toHaveTextContent(/30 days notice/);
    expect(availability).toHaveTextContent(/Availability Status.*Serving Notice Period/);
    expect(availability).toHaveTextContent(/Expected CTC.*₹20–30 LPA/);
    expect(availability).toHaveTextContent(/Current CTC.*₹15 LPA/);
    expect(availability).toHaveTextContent(/Preferred Locations.*Kolkata.*Bengaluru/);
    expect(sections.getByTestId('profile.section.clinicalSkills')).toHaveTextContent(/Emergency Care/);
    expect(sections.getByTestId('profile.section.technicalSkills')).toHaveTextContent(/ECG interpretation/);
    expect(sections.getByTestId('profile.section.languages')).toHaveTextContent(/Bengali/);
    // The website names a nameless file "Document {n}".
    expect(sections.getByTestId('profile.section.documents.1')).toHaveTextContent(/Document 2/);
  });

  it('hides a section that has no data, like the website', async () => {
    installJobsBackend({ me: applicantMe });
    await openProfile();
    expect(await screen.findByTestId('profile.sections')).toBeOnTheScreen();
    for (const key of [
      'about',
      'experience',
      'education',
      'procedures',
      'certifications',
      'publications',
      'documents',
      'registration',
    ]) {
      expect(screen.queryByTestId(`profile.section.${key}`)).toBeNull();
    }
    // Only the preferred locations are set: Availability shows them and no empty rows.
    const availability = screen.getByTestId('profile.section.availability');
    expect(availability).toHaveTextContent(/^AvailabilityEditPreferred LocationsKolkataBengaluru$/);
    expect(screen.getByTestId('profile.section.clinicalSkills')).toBeOnTheScreen();
    expect(screen.getByTestId('profile.section.languages')).toBeOnTheScreen();
  });

  it("a section's Edit opens the builder at that section's step", async () => {
    installJobsBackend({ me: richMe });
    await openProfile();
    await fireEvent.press(await screen.findByTestId('profile.section.experience.edit'));
    expect(await screen.findByTestId('builder.progress')).toHaveTextContent('Step 5 of 16');
  });

  it('a supporting document opens in the in-app browser (website "Open"); a link that is not http(s) is refused', async () => {
    installJobsBackend({ me: richMe });
    await openProfile();
    await fireEvent.press(await screen.findByTestId('profile.section.documents.0'));
    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith('https://res.example.test/licence.pdf');
    jest.mocked(WebBrowser.openBrowserAsync).mockClear();
    await fireEvent.press(screen.getByTestId('profile.section.documents.1'));
    expect(WebBrowser.openBrowserAsync).not.toHaveBeenCalled();
    expect(await screen.findByText("This link can't be opened.")).toBeOnTheScreen();
  });

  it('M1: the hero shows the location, the phone and "Verified {role}" when verified', async () => {
    installJobsBackend({ me: richMe });
    await openProfile();
    expect(await screen.findByTestId('profile.location')).toHaveTextContent('Kolkata, West Bengal');
    expect(screen.getByTestId('profile.phone')).toHaveTextContent('9876500088');
    expect(screen.getByTestId('profile.verified')).toHaveTextContent(`Verified ${DOCTOR}`);
  });

  it('M1: no verified badge when the profile is not verified', async () => {
    installJobsBackend({ me: applicantMe });
    await openProfile();
    expect(await screen.findByTestId('profile.location')).toBeOnTheScreen();
    expect(screen.queryByTestId('profile.verified')).toBeNull();
  });

  it('M2: the stats strip shows Experience, Procedures, Certifications, Expected CTC and Current CTC', async () => {
    installJobsBackend({ me: richMe });
    await openProfile();
    expect(await screen.findByTestId('profile.stat.experience')).toHaveTextContent(/Experience.*6 yrs/);
    expect(screen.getByTestId('profile.stat.procedures')).toHaveTextContent(/Procedures.*1,240/);
    expect(screen.getByTestId('profile.stat.certifications')).toHaveTextContent(/Certifications.*1/);
    expect(screen.getByTestId('profile.stat.expectedCtc')).toHaveTextContent(/Expected CTC.*₹20–30 LPA/);
    expect(screen.getByTestId('profile.stat.currentCtc')).toHaveTextContent(/Current CTC.*₹15 LPA/);
  });

  it('M2: a salary that is not set shows a dash', async () => {
    installJobsBackend({ me: applicantMe });
    await openProfile();
    expect(await screen.findByTestId('profile.stat.expectedCtc')).toHaveTextContent(/Expected CTC.*—/);
  });
});

describe('Settings', () => {
  it('shows the app version and opens the privacy policy in the in-app browser', async () => {
    installJobsBackend({ me: applicantMe });
    await startSignedIn('/settings', 'settings.screen');
    expect(screen.getByTestId('settings.version')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('settings.privacy'));
    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(
      expect.stringMatching(/^https:\/\/apronhanger\.work\//),
    );
  });

  it("M14: the website footer's Legal & Policies links: About, Code of Conduct, Privacy Policy, Terms & Conditions", async () => {
    installJobsBackend({ me: applicantMe });
    await startSignedIn('/settings', 'settings.screen');
    expect(screen.getByTestId('settings.group.about.header')).toHaveTextContent('Legal & Policies');
    const group = within(screen.getByTestId('settings.group.about'));
    expect(group.getByTestId('settings.aboutPdf')).toHaveTextContent('About');
    expect(group.getByTestId('settings.conduct')).toHaveTextContent('Code of Conduct');
    await fireEvent.press(group.getByTestId('settings.aboutPdf'));
    expect(WebBrowser.openBrowserAsync).toHaveBeenLastCalledWith(
      'https://apronhanger.work/APRONHANGER_About.pdf',
    );
    await fireEvent.press(group.getByTestId('settings.conduct'));
    expect(WebBrowser.openBrowserAsync).toHaveBeenLastCalledWith(
      'https://apronhanger.work/APRONHANGER_Code_of_Conduct.pdf',
    );
    for (const id of ['settings.aboutPdf', 'settings.conduct']) {
      expect(screen.getByTestId(`${id}.icon`)).toHaveProp('tintColor', colors.brand);
    }
  });

  it('signs out', async () => {
    installJobsBackend({ me: applicantMe });
    await startSignedIn('/settings', 'settings.screen');
    await fireEvent.press(screen.getByTestId('settings.signout'));
    expect(await screen.findByTestId('login.screen')).toBeOnTheScreen();
  });

  it('D32: About and Account are grouped lists; Delete account is the last, red-text row', async () => {
    installJobsBackend({ me: applicantMe });
    await startSignedIn('/settings', 'settings.screen');
    expect(screen.getByTestId('settings.group.about')).toBeOnTheScreen();
    // M14: the website footer's label.
    expect(screen.getByTestId('settings.terms')).toHaveTextContent('Terms & Conditions');
    await fireEvent.press(screen.getByTestId('settings.terms'));
    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(expect.stringMatching(/terms/i));
    // D32 R2 (issue 19): Delete account is the last row of the Account group instead of a group of its own.
    expect(screen.queryByTestId('settings.group.danger')).toBeNull();
    const account = within(screen.getByTestId('settings.group.account'));
    expect(account.getByTestId('settings.signout')).toBeOnTheScreen();
    expect(account.getByTestId('settings.delete')).toBeOnTheScreen();
    expect(account.getByTestId('settings.group.account.footer')).toHaveTextContent(
      'Deletes your profile, CV, photo, documents and saved jobs. Your applications stay with the hospitals.',
    );
    expect(screen.getByTestId('settings.delete.title')).toHaveStyle({ color: colors.errorText });
    await fireEvent.press(screen.getByTestId('settings.delete'));
    expect(await screen.findByTestId('delete.screen')).toBeOnTheScreen();
  });

  it('D32 R2 (issue 19): every leading icon is brand blue, the destructive row carries a red trash icon', async () => {
    installJobsBackend({ me: applicantMe });
    await startSignedIn('/settings', 'settings.screen');
    for (const id of ['settings.privacy', 'settings.terms', 'settings.signout']) {
      expect(screen.getByTestId(`${id}.icon`)).toHaveProp('tintColor', colors.brand);
    }
    expect(screen.getByTestId('settings.delete.icon')).toHaveProp('tintColor', colors.errorText);
  });
});

describe('Profile tab navigation', () => {
  it('opens the profile builder', async () => {
    installJobsBackend({ me: applicantMe });
    await openProfile();
    await fireEvent.press(await screen.findByTestId('profile.edit'));
    expect(await screen.findByTestId('builder.screen')).toBeOnTheScreen();
  });

  it('opens Settings', async () => {
    installJobsBackend({ me: applicantMe });
    await openProfile();
    await fireEvent.press(await screen.findByTestId('profile.settings'));
    expect(await screen.findByTestId('settings.screen')).toBeOnTheScreen();
  });
});

describe('Profile photo', () => {
  const photo = (name = 'me.jpg', fileSize = 1000) =>
    ({
      canceled: false,
      assets: [{ uri: `file:///cache/${name}`, fileName: name, fileSize, mimeType: 'image/jpeg' }],
    }) as never;
  const setup = (me = applicantMe) => {
    const calls: string[] = [];
    installJobsBackend({ me });
    server.use(
      http.post(`${API}/api/upload/avatar`, () => {
        calls.push('POST avatar');
        return HttpResponse.json({ url: 'https://res.example.test/a.jpg', publicId: 'avatars/a' });
      }),
      http.delete(`${API}/api/upload/avatar`, () => {
        calls.push('DELETE avatar');
        return HttpResponse.json({ success: true });
      }),
    );
    return calls;
  };

  // D32 R2 (issue 12): one photo control. The avatar and its camera badge open a sheet with the options; the old
  // "Take photo" / "Choose from gallery" / "Remove photo" buttons under the avatar are gone, their testIDs live on.
  const openSheet = async (via = 'profile.photo.change') => {
    await fireEvent.press(await screen.findByTestId(via));
    return screen.findByTestId('profile.photo.sheet');
  };

  it('R3 a11y P3-10: screen readers get one photo control (the avatar); the sheet closes on the escape gesture', async () => {
    setup();
    await openProfile();
    const badge = await screen.findByTestId('profile.photo.change');
    expect(badge.props.accessible).toBe(false);
    expect(screen.getByTestId('profile.photo.open').props.accessibilityState).toMatchObject({ busy: false });
    const sheet = await openSheet('profile.photo.open');
    expect(typeof sheet.props.onAccessibilityEscape).toBe('function');
  });

  it('D32: the photo options live in a sheet, not under the avatar', async () => {
    setup();
    await openProfile();
    expect(screen.queryByTestId('profile.photo.sheet')).toBeNull();
    expect(screen.queryByTestId('profile.photo.gallery')).toBeNull();
    expect(screen.queryByTestId('profile.photo.camera')).toBeNull();
    await openSheet();
    expect(screen.getByTestId('profile.photo.camera')).toHaveTextContent('Take photo');
    expect(screen.getByTestId('profile.photo.gallery')).toHaveTextContent('Choose from gallery');
    expect(screen.getByTestId('profile.photo.cancel')).toHaveTextContent('Cancel');
  });

  it('D32: tapping the avatar itself opens the same sheet', async () => {
    setup();
    await openProfile();
    await openSheet('profile.photo.open');
    expect(screen.getByTestId('profile.photo.gallery')).toBeOnTheScreen();
  });

  it('Cancel closes the sheet and changes nothing', async () => {
    const calls = setup();
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockClear();
    await openProfile();
    await openSheet();
    await fireEvent.press(screen.getByTestId('profile.photo.cancel'));
    await waitFor(() => expect(screen.queryByTestId('profile.photo.sheet')).toBeNull());
    expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
    expect(calls).toEqual([]);
  });

  it('uploads a picture chosen from the gallery', async () => {
    const calls = setup();
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValueOnce(photo());
    await openProfile();
    await openSheet();
    await fireEvent.press(screen.getByTestId('profile.photo.gallery'));
    await waitFor(() => expect(calls).toEqual(['POST avatar']));
    expect(screen.queryByTestId('profile.photo.sheet')).toBeNull();
    expect(await screen.findByText('Profile picture updated successfully!')).toBeOnTheScreen();
  });

  it('shows the website hint for the picture rules', async () => {
    setup();
    await openProfile();
    expect(await screen.findByTestId('profile.photo.hint')).toHaveTextContent(
      'Max file size: 5MB • JPG, PNG, or WEBP',
    );
  });

  it('takes a photo with the camera', async () => {
    const calls = setup();
    jest.mocked(ImagePicker.requestCameraPermissionsAsync).mockResolvedValueOnce({
      granted: true,
      canAskAgain: true,
    } as never);
    jest.mocked(ImagePicker.launchCameraAsync).mockResolvedValueOnce(photo('cam.jpg'));
    await openProfile();
    await openSheet();
    await fireEvent.press(screen.getByTestId('profile.photo.camera'));
    await waitFor(() => expect(calls).toEqual(['POST avatar']));
  });

  it('refuses a picture over 5 MB without uploading it', async () => {
    const calls = setup();
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValueOnce(photo('big.jpg', 6 * 1024 * 1024));
    await openProfile();
    await openSheet();
    await fireEvent.press(screen.getByTestId('profile.photo.gallery'));
    expect(await screen.findByText('Profile picture must be less than 5MB.')).toBeOnTheScreen();
    expect(calls).toEqual([]);
  });

  it('removes the picture after a confirm, only when there is one', async () => {
    const calls = setup({ ...applicantMe, avatarUrl: 'https://res.example.test/a.jpg' } as never);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      buttons?.find((b) => b.text === 'Remove')?.onPress?.();
    });
    await openProfile();
    await openSheet();
    expect(screen.getByTestId('profile.photo.remove')).toHaveTextContent('Remove photo');
    await fireEvent.press(screen.getByTestId('profile.photo.remove'));
    await waitFor(() => expect(calls).toEqual(['DELETE avatar']));
    expect(await screen.findByText('Profile picture removed.')).toBeOnTheScreen();
    alert.mockRestore();
  });

  it('has no Remove option without a picture', async () => {
    setup();
    await openProfile();
    await openSheet();
    expect(screen.getByTestId('profile.photo.gallery')).toBeOnTheScreen();
    expect(screen.queryByTestId('profile.photo.remove')).toBeNull();
  });
});
