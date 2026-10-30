import type { DatePickerProps } from './datePickerTypes';

/** Web (Playwright checks only): no native picker. DateField.web types the date instead. */
export function DatePicker(_props: DatePickerProps) {
  return null;
}
