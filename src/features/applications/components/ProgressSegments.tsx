// The five-stage progress of an application on a list card (website: Timeline in routes/applications.tsx).
// D32: a 4-pt five-segment bar and a "Step n of 5" caption instead of numbered dots (the stage name is spoken, the
// pill shows the status); closed applications show the website sentence instead of the bar.
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/Text';
import { colors, radius, spacing } from '@/theme/tokens';

import { stepLabel, TIMELINE_STEPS, timelineView } from '../logic/status';

export function ProgressSegments({ testID, status }: { testID: string; status: string }) {
  const view = timelineView(status);

  if (view.kind === 'message') {
    return (
      <AppText
        testID={testID}
        variant="secondary"
        weight="medium"
        color={view.tone === 'danger' ? 'errorText' : 'mutedForeground'}
      >
        {view.text}
      </AppText>
    );
  }

  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={`Progress: step ${view.current + 1} of ${TIMELINE_STEPS.length}, ${TIMELINE_STEPS[view.current] ?? ''}`}
      style={styles.wrap}
    >
      <View style={styles.bar}>
        {TIMELINE_STEPS.map((step, i) => (
          <View
            key={step}
            testID={`${testID}.segment.${i}`}
            style={[styles.segment, i <= view.current ? styles.done : styles.todo]}
          />
        ))}
      </View>
      <AppText variant="caption" color="mutedForeground" tabular numberOfLines={1}>
        {stepLabel(view.current)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing['2'] },
  bar: { flexDirection: 'row', gap: spacing['0.5'] },
  segment: { flex: 1, height: 4, borderRadius: radius.full },
  done: { backgroundColor: colors.brand },
  todo: { backgroundColor: colors.separator },
});
