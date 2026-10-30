/**
 * Stand-in for @react-native-community/datetimepicker (native). Rendering it shows two buttons: one that "picks"
 * `fakePicker.date` and one that dismisses, the way the real picker reports it (event type `set` / `dismissed`).
 * Use: jest.mock('@react-native-community/datetimepicker', () => jest.requireActual('@/test/fakeDateTimePicker'));
 */
import { Pressable, Text } from 'react-native';

/** The day the fake picker answers with. Its current value is shown as text: `datepicker.native.value` (YYYY-MM-DD). */
export const fakePicker = { date: new Date(2021, 7, 1) };

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

type Props = {
  value: Date;
  onChange: (event: { type: 'set' | 'dismissed' }, date?: Date) => void;
  testID?: string;
};

export default function FakeDateTimePicker({ value, onChange }: Props) {
  return (
    <>
      <Text testID="datepicker.native.value">{ymd(value)}</Text>
      <Pressable testID="datepicker.native.pick" onPress={() => onChange({ type: 'set' }, fakePicker.date)}>
        <Text>pick</Text>
      </Pressable>
      <Pressable testID="datepicker.native.dismiss" onPress={() => onChange({ type: 'dismissed' })}>
        <Text>dismiss</Text>
      </Pressable>
    </>
  );
}

export const DateTimePickerAndroid = { open: jest.fn(), dismiss: jest.fn() };
