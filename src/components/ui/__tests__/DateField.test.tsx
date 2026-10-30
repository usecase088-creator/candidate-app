import { fireEvent, renderWithProviders as render, screen } from '@/test/render';
import { useState } from 'react';
import { Text } from 'react-native';

import { fakePicker } from '@/test/fakeDateTimePicker';

import { DateField, fromYmd, toYmd } from '../DateField';
import { DatePicker as AndroidPicker } from '../datePicker.android';

jest.mock('@react-native-community/datetimepicker', () => jest.requireActual('@/test/fakeDateTimePicker'));

function Host({ initial = '', required = false }: { initial?: string; required?: boolean }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <DateField testID="f.start" label="Start date" value={value} onChange={setValue} required={required} />
      <DateField testID="f.other" label="Other" value="" onChange={() => undefined} />
      <Text testID="stored">{value}</Text>
    </>
  );
}

beforeEach(() => {
  fakePicker.date = new Date(2021, 7, 1);
});

describe('date helpers (the website keeps dates as YYYY-MM-DD)', () => {
  it('turns a picked day into YYYY-MM-DD in local time, never shifted by the time zone', async () => {
    expect(toYmd(new Date(2021, 7, 1, 0, 30))).toBe('2021-08-01');
    expect(toYmd(new Date(2021, 11, 31, 23, 59))).toBe('2021-12-31');
  });

  it('reads YYYY-MM-DD back as that local day, and anything else as nothing', async () => {
    const d = fromYmd('2021-08-01')!;
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2021, 7, 1]);
    expect(fromYmd('')).toBeNull();
    expect(fromYmd('2021-02-30')).toBeNull();
    expect(fromYmd('01/08/2021')).toBeNull();
  });
});

describe('DateField (iOS: picker in a sheet with Done)', () => {
  it('shows "Select date" when empty, with a label for screen readers', async () => {
    await render(<Host />);
    expect(screen.getByTestId('f.start')).toHaveTextContent('Select date');
    expect(screen.getByTestId('f.start')).toHaveProp('accessibilityLabel', 'Start date, not set');
  });

  it('shows a month-only date saved by the website (2018-01) as the first of that month, and keeps it until a new pick', async () => {
    await render(<Host initial="2018-01" />);
    expect(screen.getByTestId('f.start')).toHaveTextContent('1 Jan 2018');
    expect(screen.getByTestId('stored')).toHaveTextContent('2018-01');
  });

  it('shows a saved date in words', async () => {
    await render(<Host initial="2021-08-01" />);
    expect(screen.getByTestId('f.start')).toHaveTextContent('1 Aug 2021');
    expect(screen.getByTestId('f.start')).toHaveProp('accessibilityLabel', 'Start date, 1 Aug 2021');
  });

  it('opens the picker at the saved date and keeps the day only after Done', async () => {
    await render(<Host initial="2020-01-15" />);
    await fireEvent.press(screen.getByTestId('f.start'));
    expect(screen.getByTestId('datepicker.native.value')).toHaveTextContent('2020-01-15');
    await fireEvent.press(screen.getByTestId('datepicker.native.pick'));
    expect(screen.getByTestId('stored')).toHaveTextContent('2020-01-15');
    await fireEvent.press(screen.getByTestId('f.start.done'));
    expect(screen.getByTestId('stored')).toHaveTextContent('2021-08-01');
    expect(screen.queryByTestId('datepicker.native.pick')).toBeNull();
  });

  it('Cancel leaves the date as it was', async () => {
    await render(<Host initial="2020-01-15" />);
    await fireEvent.press(screen.getByTestId('f.start'));
    await fireEvent.press(screen.getByTestId('datepicker.native.pick'));
    await fireEvent.press(screen.getByTestId('f.start.cancel'));
    expect(screen.getByTestId('stored')).toHaveTextContent('2020-01-15');
  });

  it('an optional date can be cleared', async () => {
    await render(<Host initial="2021-08-01" />);
    await fireEvent.press(screen.getByTestId('f.start.clear'));
    expect(screen.getByTestId('stored')).toHaveTextContent('');
  });

  it('a required date has no Clear', async () => {
    await render(<Host initial="2021-08-01" required />);
    expect(screen.queryByTestId('f.start.clear')).toBeNull();
  });
});

describe('DatePicker on Android (the system dialog)', () => {
  it('a picked day is kept at once and the dialog closes', async () => {
    const onPick = jest.fn();
    const onClose = jest.fn();
    await render(<AndroidPicker testID="a" visible value={new Date(2020, 0, 1)} onPick={onPick} onClose={onClose} />);
    await fireEvent.press(screen.getByTestId('datepicker.native.pick'));
    expect(onPick).toHaveBeenCalledWith(fakePicker.date);
    expect(onClose).toHaveBeenCalled();
  });

  it('dismissing keeps nothing', async () => {
    const onPick = jest.fn();
    const onClose = jest.fn();
    await render(<AndroidPicker testID="a" visible value={new Date(2020, 0, 1)} onPick={onPick} onClose={onClose} />);
    await fireEvent.press(screen.getByTestId('datepicker.native.dismiss'));
    expect(onPick).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('shows nothing while closed', async () => {
    await render(<AndroidPicker testID="a" visible={false} value={new Date()} onPick={jest.fn()} onClose={jest.fn()} />);
    expect(screen.queryByTestId('datepicker.native.pick')).toBeNull();
  });
});
