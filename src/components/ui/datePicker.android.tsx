import DateTimePicker from '@react-native-community/datetimepicker';

import type { DatePickerProps } from './datePickerTypes';

/** Android: the system date dialog. A picked day is kept at once; Cancel keeps nothing. */
export function DatePicker({ visible, value, onPick, onClose, maximumDate, minimumDate }: DatePickerProps) {
  if (!visible) return null;
  return (
    <DateTimePicker
      mode="date"
      value={value}
      maximumDate={maximumDate}
      minimumDate={minimumDate}
      onChange={(event, date) => {
        onClose();
        if (event.type === 'set' && date) onPick(date);
      }}
    />
  );
}
