// The five-step progress of an application (website: Timeline in routes/applications.tsx). Five labels do not fit
// side by side on a narrow phone, so the steps are numbered dots and the current step is named under them.
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/Text';
import { colors, radius, spacing } from '@/theme/tokens';

import { TIMELINE_STEPS, timelineView } from '../logic/status';

const DOT = 24;

export function Timeline({ testID, status }: { testID: string; status: string }) {
  const view = timelineView(status);

  if (view.kind === 'message') {
    const danger = view.tone === 'danger';
    return (
      <View
        testID={testID}
        style={[
          styles.message,
          {
            borderColor: danger ? colors.destructiveSoft : colors.border,
            backgroundColor: danger ? colors.destructiveSoft : colors.surface2,
          },
        ]}
      >
        <AppText variant="caption" color={danger ? 'errorText' : 'mutedForeground'}>
          {view.text}
        </AppText>
      </View>
    );
  }

  const name = TIMELINE_STEPS[view.current] ?? '';
  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={`Progress: step ${view.current + 1} of ${TIMELINE_STEPS.length}, ${name}`}
      style={styles.wrap}
    >
      <View style={styles.dots}>
        {TIMELINE_STEPS.map((step, i) => {
          const done = i <= view.current;
          return (
            <View key={step} style={styles.item}>
              <View
                testID={`${testID}.step.${i}`}
                accessibilityState={{ selected: i === view.current }}
                style={[styles.dot, done ? styles.dotDone : styles.dotTodo]}
              >
                <AppText
                  variant="caption"
                  weight="semibold"
                  color={done ? 'brandForeground' : 'mutedForeground'}
                >
                  {String(i + 1)}
                </AppText>
              </View>
              {i < TIMELINE_STEPS.length - 1 && (
                <View style={[styles.line, i < view.current ? styles.lineDone : styles.lineTodo]} />
              )}
            </View>
          );
        })}
      </View>
      <AppText variant="caption" weight="medium">
        {name}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing['2'] },
  dots: { flexDirection: 'row', alignItems: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', flexGrow: 1, flexShrink: 1 },
  dot: { width: DOT, height: DOT, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  dotDone: { backgroundColor: colors.brand },
  dotTodo: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  line: { height: 2, flexGrow: 1, borderRadius: radius.full, marginHorizontal: spacing['1'] },
  lineDone: { backgroundColor: colors.brand },
  lineTodo: { backgroundColor: colors.border },
  message: {
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing['3'],
    paddingVertical: spacing['2'],
  },
});
