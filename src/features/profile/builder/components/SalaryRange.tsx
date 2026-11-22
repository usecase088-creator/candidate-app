import { StyleSheet, View } from 'react-native';

import { FieldLabel } from '@/components/ui/FieldLabel';
import { TextInput } from '@/components/ui/TextInput';
import { spacing } from '@/theme/tokens';

type Props = {
  /** `builder.field.<key>`: the label is `{testID}.label`, the inputs `builder.field.<minKey>` / `<maxKey>`. */
  testID: string;
  minTestID: string;
  maxTestID: string;
  /** Live, like the website: "Expected salary range: ₹10-20 LPA". */
  label: string;
  /** "Expected salary" / "Current salary": spoken before Minimum / Maximum. */
  name: string;
  required?: boolean;
  min: number;
  max: number;
  /** Website slider range 0-120 LPA (D28.4). */
  cap: number;
  onChange: (min: number, max: number) => void;
};

const toNumber = (t: string, cap: number) => {
  const n = Number(t.replace(/[^\d]/g, ''));
  return Number.isFinite(n) ? Math.min(Math.max(n, 0), cap) : 0;
};

/**
 * Website salary slider pair (ProfileFormWizard step 12) as two number boxes (D28.4): the group label shows the range
 * as it is typed, each box is capped at the slider's maximum.
 */
export function SalaryRange({
  testID,
  minTestID,
  maxTestID,
  label,
  name,
  required,
  min,
  max,
  cap,
  onChange,
}: Props) {
  return (
    <View style={styles.group}>
      <View testID={`${testID}.label`}>
        <FieldLabel testID={`${testID}.label`} label={label} required={required} />
      </View>
      <View style={styles.row}>
        <View style={styles.flex}>
          <TextInput
            testID={minTestID}
            label="Minimum (LPA)"
            accessibilityLabel={`${name}, minimum (LPA)`}
            value={min ? String(min) : ''}
            placeholder="0"
            keyboardType="numeric"
            returnKeyType="next"
            onChangeText={(t) => onChange(toNumber(t, cap), max)}
          />
        </View>
        <View style={styles.flex}>
          <TextInput
            testID={maxTestID}
            label="Maximum (LPA)"
            accessibilityLabel={`${name}, maximum (LPA)`}
            value={max ? String(max) : ''}
            placeholder="0"
            keyboardType="numeric"
            returnKeyType="next"
            onChangeText={(t) => onChange(min, toNumber(t, cap))}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing['2'] },
  row: { flexDirection: 'row', gap: spacing['3'] },
  flex: { flex: 1 },
});
