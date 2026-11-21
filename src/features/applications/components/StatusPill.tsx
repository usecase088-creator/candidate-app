// The status label (website: statusPillClass). D32: a `Pill` whose colour says what the status needs
// (amber = needs you, blue = waiting, green = done, red = closed), not which stage it is.
import { StyleSheet, View } from 'react-native';

import { Pill } from '@/components/ui/Pill';

import { statusLabel, statusTone } from '../logic/status';

export function StatusPill({
  testID = 'application.statusPill',
  status,
}: {
  testID?: string;
  status: string;
}) {
  const label = statusLabel(status);
  return (
    <View testID={testID} accessible accessibilityLabel={`Status: ${label}`} style={styles.wrap}>
      <Pill testID={`${testID}.pill`} label={label} tone={statusTone(status)} />
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { alignSelf: 'flex-start' } });
