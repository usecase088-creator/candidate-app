import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, MIN_TOUCH, radius, spacing } from '@/theme/tokens';

import { DatePicker } from './datePicker';
import { AppText } from './Text';
import { TextButton } from './TextButton';

/** A day as the website stores it (its date input): YYYY-MM-DD, in local time. */
export function toYmd(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** YYYY-MM-DD back to that local day; anything else (or an impossible day) is null. */
export function fromYmd(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return toYmd(d) === s.trim() ? d : null;
}

const inWords = (d: Date) =>
  d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export type DateFieldProps = {
  /** `{id}` the field, `{id}.clear`, `{id}.done` / `{id}.cancel` (iOS sheet). */
  testID: string;
  label: string;
  helper?: string;
  /** YYYY-MM-DD or empty. */
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  maximumDate?: Date;
};

/** A date chosen with the phone's own date picker; the value stays YYYY-MM-DD like the website's. */
export function DateField({ testID, label, helper, value, onChange, required, maximumDate }: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const day = fromYmd(value);
  const shown = day ? inWords(day) : '';
  return (
    <View style={styles.container}>
      <AppText variant="label">{required ? `${label} *` : label}</AppText>
      <View style={styles.row}>
        <Pressable
          testID={testID}
          accessibilityRole="button"
          accessibilityLabel={`${label}, ${shown || 'not set'}`}
          accessibilityHint="Opens the date picker"
          onPress={() => setOpen(true)}
          style={styles.field}
        >
          <AppText color={shown ? 'foreground' : 'mutedForeground'}>{shown || 'Select date'}</AppText>
        </Pressable>
        {shown && !required ? (
          <TextButton
            testID={`${testID}.clear`}
            label="Clear"
            accessibilityLabel={`Clear ${label}`}
            onPress={() => onChange('')}
          />
        ) : null}
      </View>
      {helper ? (
        <AppText variant="caption" color="mutedForeground">
          {helper}
        </AppText>
      ) : null}
      <DatePicker
        testID={testID}
        visible={open}
        value={day ?? new Date()}
        maximumDate={maximumDate}
        onPick={(d) => onChange(toYmd(d))}
        onClose={() => setOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing['2'], alignSelf: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing['2'] },
  field: {
    flex: 1,
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.input,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing['3'],
    paddingVertical: spacing['3'],
  },
});
