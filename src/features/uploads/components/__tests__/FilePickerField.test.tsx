import { fireEvent, renderWithProviders, screen } from '@/test/render';

import { FilePickerField, type FilePickerFieldProps } from '../FilePickerField';

const MB = 1024 * 1024;
const files = [
  { uri: 'file:///c/a.pdf', name: 'id-proof.pdf', size: 2 * MB, mime: 'application/pdf' },
  { uri: 'file:///c/b.jpg', name: 'photo.jpg', size: 340 * 1024, mime: 'image/jpeg' },
];

function props(over: Partial<FilePickerFieldProps> = {}): FilePickerFieldProps {
  return {
    testID: 'docs',
    title: 'Choose Files',
    hint: 'PDF or image, up to 5MB each',
    files: [],
    sources: ['files', 'gallery', 'camera'],
    onPick: jest.fn(),
    onRemove: jest.fn(),
    onCancel: jest.fn(),
    onRetry: jest.fn(),
    upload: { state: 'idle', progress: 0 },
    ...over,
  };
}

describe('empty', () => {
  it('shows the title, the hint and one button per source', async () => {
    await renderWithProviders(<FilePickerField {...props()} />);
    expect(screen.getByText('Choose Files')).toBeTruthy();
    expect(screen.getByText('PDF or image, up to 5MB each')).toBeTruthy();
    expect(screen.getByText('No files selected')).toBeTruthy();
    for (const source of ['files', 'gallery', 'camera'])
      expect(screen.getByTestId(`docs.pick.${source}`)).toBeTruthy();
  });

  it('only the sources it is given (a CV has no camera)', async () => {
    await renderWithProviders(<FilePickerField {...props({ sources: ['files'] })} />);
    expect(screen.getByTestId('docs.pick.files')).toBeTruthy();
    expect(screen.queryByTestId('docs.pick.camera')).toBeNull();
    expect(screen.queryByTestId('docs.pick.gallery')).toBeNull();
  });

  it('every source button has an accessibility label, and tapping it reports the source', async () => {
    const onPick = jest.fn();
    await renderWithProviders(<FilePickerField {...props({ onPick })} />);
    expect(screen.getByLabelText('Choose from files')).toBeTruthy();
    expect(screen.getByLabelText('Choose from photos')).toBeTruthy();
    expect(screen.getByLabelText('Take a photo')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('docs.pick.camera'));
    await fireEvent.press(screen.getByTestId('docs.pick.gallery'));
    expect(onPick.mock.calls).toEqual([['camera'], ['gallery']]);
  });
});

describe('with files', () => {
  it('lists each file with its readable size and says how many are selected', async () => {
    await renderWithProviders(<FilePickerField {...props({ files })} />);
    expect(screen.getByText('2 file(s) selected')).toBeTruthy();
    expect(screen.getByText('id-proof.pdf')).toBeTruthy();
    expect(screen.getByText('2.0 MB')).toBeTruthy();
    expect(screen.getByText('340 KB')).toBeTruthy();
  });

  it('Remove drops that file and has a spoken label with the file name', async () => {
    const onRemove = jest.fn();
    await renderWithProviders(<FilePickerField {...props({ files, onRemove })} />);
    expect(screen.getByLabelText('Remove photo.jpg')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('docs.remove.1'));
    expect(onRemove).toHaveBeenCalledWith(1);
  });

  it('shows a validation message under the files', async () => {
    await renderWithProviders(
      <FilePickerField {...props({ files, error: '"big.pdf" exceeds 5MB. Please use a smaller file.' })} />,
    );
    expect(screen.getByTestId('docs.error')).toHaveTextContent(
      '"big.pdf" exceeds 5MB. Please use a smaller file.',
    );
  });

  it('a single-file field says "1 file selected" in the website words', async () => {
    await renderWithProviders(<FilePickerField {...props({ files: files.slice(0, 1), single: true })} />);
    expect(screen.getByText('id-proof.pdf')).toBeTruthy();
    expect(screen.queryByText('1 file(s) selected')).toBeNull();
  });
});

describe('uploading', () => {
  const uploading = { state: 'uploading' as const, progress: 0.4 };

  it('shows a progress bar with the percent, announced to screen readers', async () => {
    await renderWithProviders(<FilePickerField {...props({ files, upload: uploading })} />);
    const bar = screen.getByTestId('docs.progress');
    expect(bar.props.accessibilityRole).toBe('progressbar');
    expect(bar.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 40 });
    expect(screen.getByText('Uploading… 40%')).toBeTruthy();
  });

  it('offers Cancel, and hides Remove and the source buttons while it runs', async () => {
    const onCancel = jest.fn();
    await renderWithProviders(<FilePickerField {...props({ files, upload: uploading, onCancel })} />);
    await fireEvent.press(screen.getByTestId('docs.cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('docs.remove.0')).toBeNull();
    expect(screen.queryByTestId('docs.pick.files')).toBeNull();
  });

  it('progress is clamped to 0-100', async () => {
    await renderWithProviders(
      <FilePickerField {...props({ files, upload: { state: 'uploading', progress: 1.7 } })} />,
    );
    expect(screen.getByTestId('docs.progress').props.accessibilityValue.now).toBe(100);
  });

  it('shows "Starting…" before the first progress event', async () => {
    await renderWithProviders(
      <FilePickerField {...props({ files, upload: { state: 'uploading', progress: 0 } })} />,
    );
    expect(screen.getByText('Starting upload…')).toBeTruthy();
  });
});

describe('failed upload', () => {
  const failed = {
    state: 'error' as const,
    progress: 0.4,
    message: 'Network error. Please check your connection and try again.',
  };

  it('shows the reason and a Retry button; the files stay so nothing has to be chosen again', async () => {
    const onRetry = jest.fn();
    await renderWithProviders(<FilePickerField {...props({ files, upload: failed, onRetry })} />);
    expect(screen.getByTestId('docs.upload.error')).toHaveTextContent(
      'Network error. Please check your connection and try again.',
    );
    expect(screen.getByLabelText('Try again')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('docs.retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.getByText('id-proof.pdf')).toBeTruthy();
    expect(screen.getByTestId('docs.remove.0')).toBeTruthy();
  });
});

describe('disabled', () => {
  it('blocks every button (e.g. while the application is being submitted)', async () => {
    const onPick = jest.fn();
    const onRemove = jest.fn();
    await renderWithProviders(<FilePickerField {...props({ files, disabled: true, onPick, onRemove })} />);
    await fireEvent.press(screen.getByTestId('docs.pick.files'));
    await fireEvent.press(screen.getByTestId('docs.remove.0'));
    expect(onPick).not.toHaveBeenCalled();
    expect(onRemove).not.toHaveBeenCalled();
    expect(screen.getByTestId('docs.pick.files').props.accessibilityState.disabled).toBe(true);
  });
});
