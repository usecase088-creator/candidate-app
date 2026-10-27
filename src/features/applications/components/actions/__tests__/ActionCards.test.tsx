// The cards where a candidate answers: interview, documents, offer, joining. Real hooks, MSW as the server.
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import { delay, http, HttpResponse } from 'msw';
import { Alert, Linking } from 'react-native';

import { ApplicationSchema } from '@/api/schemas/applications';
import * as Sharing from 'expo-sharing';
import {
  applied,
  documentsRequested,
  documentsUploaded,
  interviewInPerson,
  interviewVirtual,
  joiningConfirmed,
  offerSent,
} from '@/test/fixtures/applications';
import { installApplicationsBackend } from '@/test/msw/applications';
import { API } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { fireEvent, renderWithProviders, screen, waitFor, within } from '@/test/render';
import { installXhrOverFetch } from '@/test/xhrOverFetch';

import { ActionCard } from '../ActionCard';

jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
}));
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));
jest.mock('expo-file-system', () => ({
  File: { downloadFileAsync: jest.fn() },
  Directory: class {},
  Paths: { cache: 'file:///cache/' },
}));

const pickDoc = jest.mocked(DocumentPicker.getDocumentAsync);
const gallery = jest.mocked(ImagePicker.launchImageLibraryAsync);
const camera = jest.mocked(ImagePicker.launchCameraAsync);
const askCamera = jest.mocked(ImagePicker.requestCameraPermissionsAsync);
const browser = jest.mocked(WebBrowser.openBrowserAsync);
const share = jest.mocked(Sharing.shareAsync);

let restoreXhr: () => void;
beforeAll(() => {
  restoreXhr = installXhrOverFetch();
});
afterAll(() => restoreXhr());
beforeEach(() => {
  // Only this file's mocks: resetAllMocks would also strip the ones the global test setup relies on.
  for (const m of [pickDoc, gallery, camera, askCamera, browser, share]) m.mockReset();
  jest.restoreAllMocks();
  browser.mockResolvedValue({ type: 'dismiss' } as never);
});

const MB = 1024 * 1024;
const show = (row: unknown) => renderWithProviders(<ActionCard application={ApplicationSchema.parse(row)} />);
const setup = (row: Record<string, unknown> & { id: string }) =>
  installApplicationsBackend({ apps: [row] as never });

/** Taps the confirm button of the last native alert. */
function confirmAlert(buttonText: string) {
  const alert = jest.spyOn(Alert, 'alert');
  return {
    alert,
    press: () =>
      alert.mock.calls
        .at(-1)?.[2]
        ?.find((b) => b.text === buttonText)
        ?.onPress?.(),
  };
}

describe('no card', () => {
  it.each([[applied], [{ ...applied, status: 'Rejected' }], [{ ...applied, status: 'InterviewAccepted' }]])(
    '%#: nothing is shown',
    async (row) => {
      await show(row);
      expect(screen.queryByTestId('action.card')).not.toBeOnTheScreen();
    },
  );
});

describe('interview', () => {
  it('shows date and time in India time, type, a Join Meeting link and the interviewer', async () => {
    await show(interviewVirtual);
    expect(screen.getByText('Interview Scheduled')).toBeOnTheScreen();
    expect(screen.getByText('30 Oct 2026, 7:30 pm')).toBeOnTheScreen();
    expect(screen.getByText('Virtual')).toBeOnTheScreen();
    expect(screen.getByText('Dr. Seed Interviewer')).toBeOnTheScreen();
    expect(screen.getByText('Link:')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('action.interview.join'));
    expect(browser).toHaveBeenCalledWith('https://example.org/meet/seed-interview');
  });

  it('in person: the venue, and no link', async () => {
    await show(interviewInPerson);
    expect(screen.getByText('Venue:')).toBeOnTheScreen();
    expect(screen.getByText('Seed Valley Care Centre, 2nd floor, Bengaluru')).toBeOnTheScreen();
    expect(screen.queryByTestId('action.interview.join')).not.toBeOnTheScreen();
  });

  it('no venue: TBA', async () => {
    await show({ ...interviewInPerson, venue: null });
    expect(screen.getByText('TBA')).toBeOnTheScreen();
  });

  it('every button has a spoken label', async () => {
    await show(interviewVirtual);
    expect(screen.getByLabelText('Accept interview')).toBeOnTheScreen();
    expect(screen.getByLabelText('Request reschedule')).toBeOnTheScreen();
    expect(screen.getByLabelText('Decline interview')).toBeOnTheScreen();
    expect(screen.getByLabelText('Join meeting')).toBeOnTheScreen();
  });

  it('Accept sends InterviewAccepted and tells the user "Response recorded successfully!"', async () => {
    const backend = setup(interviewVirtual);
    await show(interviewVirtual);
    await fireEvent.press(screen.getByTestId('action.interview.accept'));
    expect(await screen.findByText('Response recorded successfully!')).toBeOnTheScreen();
    expect(backend.bodies[0]).toEqual({ status: 'InterviewAccepted' });
  });

  it('Decline asks first (D26): Cancel changes nothing, Decline sends InterviewDeclined', async () => {
    const backend = setup(interviewVirtual);
    const confirm = confirmAlert('Decline');
    await show(interviewVirtual);
    await fireEvent.press(screen.getByTestId('action.interview.decline'));
    expect(confirm.alert.mock.calls.at(-1)?.[0]).toBe('Decline this interview?');
    expect(backend.bodies).toEqual([]);
    expect(confirm.alert.mock.calls.at(-1)?.[2]?.find((b) => b.text === 'Cancel')?.style).toBe('cancel');
    confirm.press();
    await waitFor(() => expect(backend.bodies[0]).toEqual({ status: 'InterviewDeclined' }));
  });

  it('Request Reschedule opens a box; Submit Request is off until something is written, and sends the note', async () => {
    const backend = setup(interviewVirtual);
    await show(interviewVirtual);
    await fireEvent.press(screen.getByTestId('action.interview.reschedule'));
    expect(
      screen.getByPlaceholderText('Please provide your availability for rescheduling...'),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('action.interview.reschedule.submit')).toBeDisabled();
    await fireEvent.changeText(screen.getByTestId('action.interview.note'), '   ');
    expect(screen.getByTestId('action.interview.reschedule.submit')).toBeDisabled();
    await fireEvent.changeText(screen.getByTestId('action.interview.note'), 'Friday after 3 pm');
    await fireEvent.press(screen.getByTestId('action.interview.reschedule.submit'));
    expect(await screen.findByText('Response recorded successfully!')).toBeOnTheScreen();
    expect(backend.bodies[0]).toEqual({
      status: 'RescheduleRequested',
      candidateResponseNote: 'Friday after 3 pm',
    });
  });

  it('Cancel closes the box and brings the three buttons back, keeping nothing sent', async () => {
    const backend = setup(interviewVirtual);
    await show(interviewVirtual);
    await fireEvent.press(screen.getByTestId('action.interview.reschedule'));
    await fireEvent.press(screen.getByTestId('action.interview.reschedule.cancel'));
    expect(screen.getByTestId('action.interview.accept')).toBeOnTheScreen();
    expect(backend.bodies).toEqual([]);
  });

  it('buttons are locked while a request runs (no double taps)', async () => {
    const backend = setup(interviewVirtual);
    server.use(
      http.patch(`${API}/api/applications/:id`, async ({ request }) => {
        backend.bodies.push(await request.json());
        await delay(300);
        return HttpResponse.json({ ...interviewVirtual, status: 'InterviewAccepted' });
      }),
    );
    await show(interviewVirtual);
    await fireEvent.press(screen.getByTestId('action.interview.accept'));
    await fireEvent.press(screen.getByTestId('action.interview.accept'));
    await waitFor(() => expect(screen.getByTestId('action.interview.decline')).toBeDisabled());
    await screen.findByText('Response recorded successfully!');
    expect(backend.bodies).toHaveLength(1);
  });

  it('a refusal shows "Failed to update status" with the server reason', async () => {
    setup({ ...interviewVirtual, status: 'InterviewDeclined' });
    await show(interviewVirtual);
    await fireEvent.press(screen.getByTestId('action.interview.accept'));
    expect(
      await screen.findByText(/^Failed to update status: Application status "InterviewDeclined" is final/),
    ).toBeOnTheScreen();
  });
});

describe('documents requested', () => {
  const chooseFiles = async () => fireEvent.press(screen.getByTestId('action.docs.files.pick.files'));
  const asset = (name: string, size = MB, mimeType = 'application/pdf') => ({
    uri: `file:///c/${name}`,
    name,
    size,
    mimeType,
  });

  it('shows the website text, the list of requested documents and the note', async () => {
    await show(documentsRequested);
    expect(screen.getByText('Document Request')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'The hospital has requested the following documents to proceed with your application:',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('• Medical registration certificate')).toBeOnTheScreen();
    expect(screen.getByText('• Experience letter')).toBeOnTheScreen();
    expect(screen.getByText('• Identity proof')).toBeOnTheScreen();
    expect(
      screen.getByText('Note: Please upload clear scans. PDF or photo, up to 5 MB each.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('No files selected')).toBeOnTheScreen();
    expect(screen.queryByTestId('action.docs.upload')).not.toBeOnTheScreen();
  });

  it('"Additional Docs Required" shows the same card', async () => {
    await show({ ...documentsRequested, status: 'AdditionalDocumentsRequired' });
    expect(screen.getByText('Document Request')).toBeOnTheScreen();
  });

  it('chosen files are listed with "n file(s) selected" and the Upload Documents button appears', async () => {
    await show(documentsRequested);
    pickDoc.mockResolvedValueOnce({
      canceled: false,
      assets: [asset('id.pdf'), asset('letter.pdf', 2 * MB)],
    } as never);
    await chooseFiles();
    expect(await screen.findByText('2 file(s) selected')).toBeOnTheScreen();
    expect(screen.getByText('id.pdf')).toBeOnTheScreen();
    expect(screen.getByTestId('action.docs.upload')).toBeEnabled();
  });

  it('a second pick adds to the first, the same file twice is kept once', async () => {
    await show(documentsRequested);
    pickDoc.mockResolvedValueOnce({ canceled: false, assets: [asset('a.pdf')] } as never);
    await chooseFiles();
    await screen.findByText('1 file(s) selected');
    pickDoc.mockResolvedValueOnce({ canceled: false, assets: [asset('a.pdf'), asset('b.pdf')] } as never);
    await chooseFiles();
    expect(await screen.findByText('2 file(s) selected')).toBeOnTheScreen();
  });

  it('a file over 5 MB is refused with the website message and the earlier files stay', async () => {
    await show(documentsRequested);
    pickDoc.mockResolvedValueOnce({ canceled: false, assets: [asset('ok.pdf')] } as never);
    await chooseFiles();
    await screen.findByText('1 file(s) selected');
    pickDoc.mockResolvedValueOnce({ canceled: false, assets: [asset('big.pdf', 5 * MB + 1)] } as never);
    await chooseFiles();
    expect(await screen.findByTestId('action.docs.files.error')).toHaveTextContent(
      '"big.pdf" exceeds 5MB. Please use a smaller file.',
    );
    expect(screen.getByText('1 file(s) selected')).toBeOnTheScreen();
  });

  it('a Word file is refused, because the server only takes PDF and pictures', async () => {
    await show(documentsRequested);
    pickDoc.mockResolvedValueOnce({
      canceled: false,
      assets: [
        asset('letter.docx', MB, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
      ],
    } as never);
    await chooseFiles();
    expect(await screen.findByTestId('action.docs.files.error')).toHaveTextContent(
      /"letter.docx" is not a PDF or image/,
    );
  });

  it('Remove drops one file', async () => {
    await show(documentsRequested);
    pickDoc.mockResolvedValueOnce({ canceled: false, assets: [asset('a.pdf'), asset('b.pdf')] } as never);
    await chooseFiles();
    await screen.findByText('2 file(s) selected');
    await fireEvent.press(screen.getByTestId('action.docs.files.remove.0'));
    expect(screen.getByText('1 file(s) selected')).toBeOnTheScreen();
    expect(screen.queryByText('a.pdf')).not.toBeOnTheScreen();
  });

  it('photos from the gallery are added the same way', async () => {
    await show(documentsRequested);
    gallery.mockResolvedValueOnce({
      canceled: false,
      assets: [
        {
          uri: 'file:///c/IMG_1.jpg',
          fileName: 'IMG_1.jpg',
          fileSize: MB,
          mimeType: 'image/jpeg',
          width: 1,
          height: 1,
        },
      ],
    } as never);
    await fireEvent.press(screen.getByTestId('action.docs.files.pick.gallery'));
    expect(await screen.findByText('IMG_1.jpg')).toBeOnTheScreen();
  });

  it('a photo from the camera is added after the permission is given', async () => {
    await show(documentsRequested);
    askCamera.mockResolvedValueOnce({ granted: true, canAskAgain: true, status: 'granted' } as never);
    camera.mockResolvedValueOnce({
      canceled: false,
      assets: [
        {
          uri: 'file:///c/cam.jpg',
          fileName: 'cam.jpg',
          fileSize: MB,
          mimeType: 'image/jpeg',
          width: 1,
          height: 1,
        },
      ],
    } as never);
    await fireEvent.press(screen.getByTestId('action.docs.files.pick.camera'));
    expect(await screen.findByText('cam.jpg')).toBeOnTheScreen();
  });

  it('camera permission refused for good: says so and offers the phone settings', async () => {
    await show(documentsRequested);
    askCamera.mockResolvedValueOnce({ granted: false, canAskAgain: false, status: 'denied' } as never);
    const settings = jest.spyOn(Linking, 'openSettings').mockResolvedValueOnce(undefined);
    await fireEvent.press(screen.getByTestId('action.docs.files.pick.camera'));
    expect(
      await screen.findByText(
        'Camera access is turned off for ApronHanger. You can turn it on in your phone settings.',
      ),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('action.docs.settings'));
    expect(settings).toHaveBeenCalledTimes(1);
    expect(camera).not.toHaveBeenCalled();
  });

  it('camera permission refused this time: asks the user to allow it, no settings button', async () => {
    await show(documentsRequested);
    askCamera.mockResolvedValueOnce({ granted: false, canAskAgain: true, status: 'denied' } as never);
    await fireEvent.press(screen.getByTestId('action.docs.files.pick.camera'));
    expect(await screen.findByText('Allow camera access to take a photo of a document.')).toBeOnTheScreen();
    expect(screen.queryByTestId('action.docs.settings')).not.toBeOnTheScreen();
  });

  it('Upload Documents sends the files, says "Documents uploaded successfully!" and empties the box', async () => {
    const backend = setup(documentsRequested);
    await show(documentsRequested);
    pickDoc.mockResolvedValueOnce({ canceled: false, assets: [asset('a.pdf'), asset('b.pdf')] } as never);
    await chooseFiles();
    await screen.findByText('2 file(s) selected');
    await fireEvent.press(screen.getByTestId('action.docs.upload'));
    expect(await screen.findByText('Documents uploaded successfully!')).toBeOnTheScreen();
    expect(backend.forms[0]).toEqual(['documents']);
    await waitFor(() => expect(screen.getByText('No files selected')).toBeOnTheScreen());
  });

  it('a failed upload keeps the files, shows the reason and Try again sends them again', async () => {
    setup(documentsRequested);
    let calls = 0;
    server.use(
      http.post(`${API}/api/applications/:id/documents`, () =>
        ++calls === 1
          ? HttpResponse.json(
              { error: 'Invalid file type: text/plain. Only PDF, JPEG, PNG, and WebP are allowed.' },
              { status: 400 },
            )
          : HttpResponse.json([{ id: 'd', name: 'a.pdf', url: 'https://example.org/a.pdf' }], {
              status: 201,
            }),
      ),
    );
    await show(documentsRequested);
    pickDoc.mockResolvedValueOnce({ canceled: false, assets: [asset('a.pdf')] } as never);
    await chooseFiles();
    await screen.findByText('1 file(s) selected');
    await fireEvent.press(screen.getByTestId('action.docs.upload'));
    expect(await screen.findByTestId('action.docs.files.upload.error')).toHaveTextContent(
      /Invalid file type: text\/plain\./,
    );
    expect(screen.getByText('a.pdf')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('action.docs.files.retry'));
    expect(await screen.findByText('Documents uploaded successfully!')).toBeOnTheScreen();
    expect(calls).toBe(2);
  });

  it('Cancel stops a running upload and keeps the files', async () => {
    setup(documentsRequested);
    server.use(
      http.post(`${API}/api/applications/:id/documents`, async () => {
        await delay(500);
        return HttpResponse.json([], { status: 201 });
      }),
    );
    await show(documentsRequested);
    pickDoc.mockResolvedValueOnce({ canceled: false, assets: [asset('a.pdf')] } as never);
    await chooseFiles();
    await screen.findByText('1 file(s) selected');
    await fireEvent.press(screen.getByTestId('action.docs.upload'));
    await screen.findByTestId('action.docs.files.progress');
    await fireEvent.press(screen.getByTestId('action.docs.files.cancel'));
    await waitFor(() => expect(screen.queryByTestId('action.docs.files.progress')).not.toBeOnTheScreen());
    expect(screen.getByText('a.pdf')).toBeOnTheScreen();
    expect(screen.queryByText('Documents uploaded successfully!')).not.toBeOnTheScreen();
  });
});

describe('documents submitted', () => {
  it('says they are under review, and lists what was sent with a way to open each', async () => {
    await show(documentsUploaded);
    expect(screen.getByText('Documents Submitted')).toBeOnTheScreen();
    expect(
      screen.getByText(
        "Your documents have been submitted and are under review by the hospital. You'll be notified once they are approved or if additional documents are required.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('Degree certificate')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('action.submitted.open.0'));
    expect(browser).toHaveBeenCalledWith('https://example.org/docs/degree-seed.pdf');
  });

  it('a document with a link that is not a web link is not openable', async () => {
    await show({
      ...documentsUploaded,
      applicationDocuments: [{ id: 'x', name: 'Odd', url: 'javascript:alert(1)' }],
    });
    await fireEvent.press(screen.getByTestId('action.submitted.open.0'));
    expect(browser).not.toHaveBeenCalled();
    expect(await screen.findByText("This link can't be opened.")).toBeOnTheScreen();
  });
});

describe('offer', () => {
  it('shows the congratulation, and the buttons', async () => {
    await show(offerSent);
    expect(screen.getByText('Offer Letter Received')).toBeOnTheScreen();
    expect(screen.getByText('Congratulations! The hospital has sent you an offer letter.')).toBeOnTheScreen();
    expect(screen.getByLabelText('View offer letter')).toBeOnTheScreen();
    expect(screen.getByLabelText('Download or share offer letter')).toBeOnTheScreen();
    expect(screen.getByLabelText('Accept offer')).toBeOnTheScreen();
    expect(screen.getByLabelText('Reject offer')).toBeOnTheScreen();
  });

  it('View Offer Letter opens the letter itself in the in-app browser (the website opens its home page)', async () => {
    await show(offerSent);
    await fireEvent.press(screen.getByTestId('action.offer.view'));
    expect(browser).toHaveBeenCalledWith('https://example.org/offer-letter-seed.pdf');
  });

  it('without a letter link there are no view or share buttons, but the answers stay', async () => {
    await show({ ...offerSent, offerLetterUrl: null });
    expect(screen.queryByTestId('action.offer.view')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('action.offer.share')).not.toBeOnTheScreen();
    expect(screen.getByTestId('action.offer.accept')).toBeOnTheScreen();
  });

  it('a letter link that is not a web link cannot be opened or shared', async () => {
    await show({ ...offerSent, offerLetterUrl: 'file:///etc/passwd' });
    await fireEvent.press(screen.getByTestId('action.offer.view'));
    expect(browser).not.toHaveBeenCalled();
    expect(await screen.findByText("This link can't be opened.")).toBeOnTheScreen();
  });

  it('Download or share hands the letter to the share sheet, and says so if it fails', async () => {
    const { File } = jest.requireMock('expo-file-system') as { File: { downloadFileAsync: jest.Mock } };
    File.downloadFileAsync.mockResolvedValueOnce({ uri: 'file:///cache/offer.pdf', delete: jest.fn() });
    jest.mocked(Sharing.isAvailableAsync).mockResolvedValue(true);
    share.mockResolvedValueOnce(undefined);
    await show(offerSent);
    await fireEvent.press(screen.getByTestId('action.offer.share'));
    await waitFor(() => expect(share).toHaveBeenCalledWith('file:///cache/offer.pdf', expect.anything()));

    File.downloadFileAsync.mockRejectedValueOnce(new Error('404'));
    await fireEvent.press(screen.getByTestId('action.offer.share'));
    expect(
      await screen.findByText('Could not download the offer letter. Please try again.'),
    ).toBeOnTheScreen();
  });

  it('Accept Offer sends OfferAccepted straight away (the website has no confirm for it)', async () => {
    const backend = setup(offerSent);
    await show(offerSent);
    await fireEvent.press(screen.getByTestId('action.offer.accept'));
    expect(await screen.findByText('Response recorded successfully!')).toBeOnTheScreen();
    expect(backend.bodies[0]).toEqual({ status: 'OfferAccepted' });
  });

  it('Reject Offer asks first (D26): Cancel changes nothing, Reject sends OfferRejected', async () => {
    const backend = setup(offerSent);
    const confirm = confirmAlert('Reject offer');
    await show(offerSent);
    await fireEvent.press(screen.getByTestId('action.offer.reject'));
    expect(confirm.alert.mock.calls.at(-1)?.[0]).toBe('Reject this offer?');
    expect(backend.bodies).toEqual([]);
    confirm.press();
    await waitFor(() => expect(backend.bodies[0]).toEqual({ status: 'OfferRejected' }));
  });
});

describe('joining', () => {
  it('shows the joining date in the website sentence', async () => {
    await show(joiningConfirmed);
    expect(screen.getByText('Joining Date')).toBeOnTheScreen();
    expect(screen.getByTestId('action.joining.text')).toHaveTextContent('Your joining date is 26 Nov 2026.');
  });

  it('shows the hospital note for the first day when there is one', async () => {
    await show(joiningConfirmed);
    expect(screen.getByText('Report to HR at 9 am with your original certificates.')).toBeOnTheScreen();
  });

  it('is a plain card with no buttons', async () => {
    await show(joiningConfirmed);
    expect(within(screen.getByTestId('action.card')).queryAllByRole('button')).toHaveLength(0);
  });
});
