import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '@/theme/tokens';

import { Button } from './Button';
import type { DatePickerProps } from './datePickerTypes';

/** iOS: the calendar in a bottom sheet. The day is kept only on Done; Cancel or a tap outside keeps nothing. */
export function DatePicker(props: DatePickerProps) {
  // Mounted on each opening, so the sheet starts at the field's current date.
  return props.visible ? <Sheet {...props} /> : null;
}

function Sheet({ testID, value, onPick, onClose, maximumDate, minimumDate }: DatePickerProps) {
  const insets = useSafeAreaInsets();
  const [day, setDay] = useState(value);
  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessible={false} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing['4'] }]}>
        <DateTimePicker
          mode="date"
          display="inline"
          value={day}
          maximumDate={maximumDate}
          minimumDate={minimumDate}
          onChange={(_event, date) => date && setDay(date)}
        />
        <View style={styles.actions}>
          <Button testID={`${testID}.cancel`} label="Cancel" variant="outline" onPress={onClose} />
          <Button
            testID={`${testID}.done`}
            label="Done"
            onPress={() => {
              onPick(day);
              onClose();
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing['4'],
    gap: spacing['3'],
  },
  actions: { flexDirection: 'row', gap: spacing['3'] },
});
