import { useState } from 'react';

import type { CustomFieldResponses } from '@/api/schemas/applications';
import { jobQuestions } from '@/test/fixtures/applications';
import { fireEvent, renderWithProviders, screen } from '@/test/render';

import { CustomFieldSchema } from '@/api/schemas/applications';
import { JobQuestionsForm } from '../JobQuestionsForm';

const fields = jobQuestions.map((q) => CustomFieldSchema.parse(q));

/** Keeps the answers the way a screen does, and exposes them for the test. */
function Harness({
  initial = {},
  onValues,
}: {
  initial?: CustomFieldResponses;
  onValues?: (v: CustomFieldResponses) => void;
}) {
  const [values, setValues] = useState<CustomFieldResponses>(initial);
  return (
    <JobQuestionsForm
      testID="q"
      title="Answer these job-specific questions"
      fields={fields}
      values={values}
      onChange={(v) => {
        setValues(v);
        onValues?.(v);
      }}
    />
  );
}

describe('rendering', () => {
  it('shows the title, and every question with a star on the required ones', async () => {
    await renderWithProviders(<Harness />);
    expect(screen.getByText('Answer these job-specific questions')).toBeTruthy();
    expect(screen.getByText('Which imaging machines have you operated? *')).toBeTruthy();
    expect(screen.getByText('Anything else the hospital should know?')).toBeTruthy();
    expect(screen.getByText('Scans you handle per day *')).toBeTruthy();
    expect(screen.getByText('Preferred shift *')).toBeTruthy();
    expect(screen.getByText('I hold a valid radiation safety certificate *')).toBeTruthy();
  });

  it('renders nothing when the job has no questions', async () => {
    await renderWithProviders(
      <JobQuestionsForm testID="q" title="T" fields={[]} values={{}} onChange={jest.fn()} />,
    );
    expect(screen.queryByTestId('q')).toBeNull();
  });

  it('every input and choice has an accessibility label', async () => {
    await renderWithProviders(<Harness />);
    expect(screen.getByLabelText('Which imaging machines have you operated? *')).toBeTruthy();
    expect(screen.getByLabelText('Scans you handle per day *')).toBeTruthy();
    expect(screen.getByLabelText('Evening')).toBeTruthy();
    expect(screen.getByLabelText('Yes')).toBeTruthy();
    expect(screen.getByLabelText('No')).toBeTruthy();
  });

  it('a question with help text and a placeholder shows them', async () => {
    const f = CustomFieldSchema.parse({
      id: 'h',
      label: 'Notice period',
      type: 'text',
      helpText: 'In days',
      placeholder: 'e.g. 30',
    });
    await renderWithProviders(
      <JobQuestionsForm testID="q" title="T" fields={[f]} values={{}} onChange={jest.fn()} />,
    );
    expect(screen.getByText('In days')).toBeTruthy();
    expect(screen.getByPlaceholderText('e.g. 30')).toBeTruthy();
  });
});

describe('answering', () => {
  it('text and long text keep what is typed', async () => {
    const seen: CustomFieldResponses[] = [];
    await renderWithProviders(<Harness onValues={(v) => seen.push(v)} />);
    await fireEvent.changeText(screen.getByTestId('q.q_modality'), '128-slice CT');
    await fireEvent.changeText(screen.getByTestId('q.q_notes'), 'Weekend shifts are fine');
    expect(seen.at(-1)).toEqual({ q_modality: '128-slice CT', q_notes: 'Weekend shifts are fine' });
  });

  it('a number box is a number pad and keeps the text as typed', async () => {
    const seen: CustomFieldResponses[] = [];
    await renderWithProviders(<Harness onValues={(v) => seen.push(v)} />);
    expect(screen.getByTestId('q.q_scans').props.keyboardType).toBe('decimal-pad');
    await fireEvent.changeText(screen.getByTestId('q.q_scans'), '1.');
    expect(seen.at(-1)).toEqual({ q_scans: '1.' });
    expect(screen.getByTestId('q.q_scans').props.value).toBe('1.');
  });

  it('a select shows every option as a button and marks the chosen one', async () => {
    const seen: CustomFieldResponses[] = [];
    await renderWithProviders(<Harness onValues={(v) => seen.push(v)} />);
    for (const i of [0, 1, 2]) expect(screen.getByTestId(`q.q_shift.option.${i}`)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('q.q_shift.option.1'));
    expect(seen.at(-1)).toEqual({ q_shift: 'Evening' });
    expect(screen.getByTestId('q.q_shift.option.1').props.accessibilityState.selected).toBe(true);
    expect(screen.getByTestId('q.q_shift.option.0').props.accessibilityState.selected).toBe(false);
    await fireEvent.press(screen.getByTestId('q.q_shift.option.2'));
    expect(seen.at(-1)).toEqual({ q_shift: 'Night' });
  });

  it('a yes/no question stores true or false, and No counts as an answer', async () => {
    const seen: CustomFieldResponses[] = [];
    await renderWithProviders(<Harness onValues={(v) => seen.push(v)} />);
    expect(screen.getByTestId('q.q_license.yes').props.accessibilityState.selected).toBe(false);
    await fireEvent.press(screen.getByTestId('q.q_license.no'));
    expect(seen.at(-1)).toEqual({ q_license: false });
    expect(screen.getByTestId('q.q_license.no').props.accessibilityState.selected).toBe(true);
    await fireEvent.press(screen.getByTestId('q.q_license.yes'));
    expect(seen.at(-1)).toEqual({ q_license: true });
  });

  it('shows answers that were already there (coming back to the screen)', async () => {
    await renderWithProviders(<Harness initial={{ q_modality: 'MRI', q_shift: 'Night', q_license: true }} />);
    expect(screen.getByTestId('q.q_modality').props.value).toBe('MRI');
    expect(screen.getByTestId('q.q_shift.option.2').props.accessibilityState.selected).toBe(true);
    expect(screen.getByTestId('q.q_license.yes').props.accessibilityState.selected).toBe(true);
  });

  it('an unknown question type is a plain text box', async () => {
    const f = CustomFieldSchema.parse({ id: 'd', label: 'Date available', type: 'date' });
    const seen: CustomFieldResponses[] = [];
    await renderWithProviders(
      <JobQuestionsForm testID="q" title="T" fields={[f]} values={{}} onChange={(v) => seen.push(v)} />,
    );
    await fireEvent.changeText(screen.getByTestId('q.d'), '1 Nov');
    expect(seen.at(-1)).toEqual({ d: '1 Nov' });
  });
});

describe('disabled and errors', () => {
  it('blocks typing and choosing while an application is being sent', async () => {
    const onChange = jest.fn();
    await renderWithProviders(
      <JobQuestionsForm testID="q" title="T" fields={fields} values={{}} onChange={onChange} disabled />,
    );
    expect(screen.getByTestId('q.q_modality').props.editable).toBe(false);
    await fireEvent.press(screen.getByTestId('q.q_shift.option.0'));
    await fireEvent.press(screen.getByTestId('q.q_license.yes'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows a message under the questions (the first problem)', async () => {
    await renderWithProviders(
      <JobQuestionsForm
        testID="q"
        title="T"
        fields={fields}
        values={{}}
        onChange={jest.fn()}
        error='"Scans you handle per day" is required'
      />,
    );
    expect(screen.getByTestId('q.error')).toHaveTextContent('"Scans you handle per day" is required');
  });
});
