// The five stages of an application on the details screen (website: Timeline in routes/applications.tsx).
// D32: a vertical timeline (node + rail per stage) with the website's last-update sentence under the current stage
// and the dates the data has. A rejection or a closed job stops the rail at a terminal node with the website sentence.
import { StyleSheet, View } from 'react-native';

import type { Application } from '@/api/schemas/applications';
import { Icon } from '@/components/ui/Icon';
import { pillTones } from '@/components/ui/Pill';
import { AppText } from '@/components/ui/Text';
import { colors, radius, spacing } from '@/theme/tokens';

import { formatIndianDate, formatIstDateTime } from '../logic/interview';
import { lastUpdateText, statusTone, TIMELINE_STEPS, timelineStep, timelineView } from '../logic/status';

const NODE = 16;
const HALO = 3;
const CHECK = { ios: 'checkmark', android: 'check', web: 'check' } as const;
const XMARK = { ios: 'xmark', android: 'close', web: 'close' } as const;

type NodeState = 'done' | 'current' | 'todo';

/** The date line of a stage, when the application has that date (the applied date is bare: the header says "Applied"). */
function stageDate(i: number, a: Application): string | undefined {
  if (i === 0 && a.appliedOn) return formatIndianDate(a.appliedOn) || undefined;
  if (i === 2 && a.interviewDate) return formatIstDateTime(a.interviewDate);
  if (i === 4 && a.joiningDate) return `Joining ${formatIndianDate(a.joiningDate)}`;
  return undefined;
}

export function VerticalTimeline({ testID, application: a }: { testID: string; application: Application }) {
  const view = timelineView(a.status);
  const tone = statusTone(a.status);
  const current = view.kind === 'steps' ? view.current : timelineStep(a.status);
  // A closed application: the stages reached stay ticked, the rail then ends in the terminal node.
  const rows = view.kind === 'steps' ? TIMELINE_STEPS.length : current + 1;
  const label =
    view.kind === 'steps'
      ? `Progress: step ${current + 1} of ${TIMELINE_STEPS.length}, ${TIMELINE_STEPS[current] ?? ''}`
      : `Progress: ${view.text}`;

  return (
    <View testID={testID} accessibilityLabel={label} style={styles.list}>
      {TIMELINE_STEPS.slice(0, rows).map((name, i) => {
        const state: NodeState =
          view.kind === 'message' ? 'done' : i < current ? 'done' : i === current ? 'current' : 'todo';
        const date = stageDate(i, a);
        const last = view.kind === 'steps' && i === rows - 1;
        return (
          <View key={name} testID={`${testID}.row.${i}`} style={[styles.row, !last && styles.rowStep]}>
            <View style={styles.spine}>
              <Node testID={`${testID}.node.${i}`} state={state} tone={tone} />
              {!last && (
                <View
                  testID={`${testID}.rail.${i}`}
                  style={[styles.rail, state === 'done' ? styles.railDone : styles.railTodo]}
                />
              )}
            </View>
            <View style={[styles.text, !last && styles.textGap]}>
              <AppText variant="label" color={state === 'todo' ? 'mutedForeground' : 'foreground'}>
                {name}
              </AppText>
              {state === 'current' ? (
                <AppText variant="secondary" color="mutedForeground">
                  {lastUpdateText(a.status)}
                </AppText>
              ) : null}
              {date ? (
                <AppText variant="secondary" color="mutedForeground" tabular>
                  {date}
                </AppText>
              ) : null}
            </View>
          </View>
        );
      })}

      {view.kind === 'message' ? (
        <View testID={`${testID}.terminal`} style={styles.row}>
          <View style={styles.spine}>
            <View
              style={[
                styles.node,
                view.tone === 'danger' ? styles.nodeTerminalDanger : styles.nodeTerminalMuted,
              ]}
            >
              <Icon name={XMARK} size={10} tintColor={colors.surface} />
            </View>
          </View>
          <View style={styles.text}>
            <AppText variant="label" color={view.tone === 'danger' ? 'errorText' : 'foreground'}>
              {view.text}
            </AppText>
            {a.finalStatusNote ? (
              <AppText variant="secondary" color="mutedForeground">
                {a.finalStatusNote}
              </AppText>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function Node({ testID, state, tone }: { testID: string; state: NodeState; tone: keyof typeof pillTones }) {
  const strong = colors[pillTones[tone].fg];
  const soft = colors[pillTones[tone].bg];
  return (
    <View
      testID={testID}
      accessibilityState={{ checked: state === 'done', selected: state === 'current' }}
      style={[
        styles.node,
        state === 'done' && styles.nodeDone,
        state === 'current' && { backgroundColor: strong, borderWidth: HALO, borderColor: soft },
        state === 'todo' && styles.nodeTodo,
      ]}
    >
      {state === 'done' ? <Icon name={CHECK} size={10} tintColor={colors.brandForeground} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {},
  row: { flexDirection: 'row', gap: spacing['3'] },
  // Every stage before the last is at least 48 pt, so the rail segments are even with or without a date line.
  rowStep: { minHeight: 48 },
  spine: { width: NODE, alignItems: 'center' },
  // Centred on the 20-pt first text line.
  node: {
    width: NODE,
    height: NODE,
    marginTop: 2,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeDone: { backgroundColor: colors.brand },
  nodeTodo: { borderWidth: 1.5, borderColor: colors.separator, backgroundColor: colors.surface },
  nodeTerminalDanger: { backgroundColor: colors.destructive },
  nodeTerminalMuted: { backgroundColor: colors.mutedForeground },
  // A 2-pt gap at each node keeps the rail reading as one continuous line.
  rail: { flex: 1, width: 2, marginVertical: 2, borderRadius: radius.full },
  railDone: { backgroundColor: colors.brand },
  railTodo: { backgroundColor: colors.separator },
  text: { flex: 1, gap: spacing['0.5'] },
  textGap: { paddingBottom: spacing['4'] },
});
