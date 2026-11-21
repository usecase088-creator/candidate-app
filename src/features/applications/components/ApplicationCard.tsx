// One application in the list (website: the row in routes/applications.tsx). The whole card opens the application,
// where the hospital's questions are answered: long forms inside a recycled list lose what was typed (D27).
// D32: ~130 pt white card, status pill coloured by need, five-segment bar, and an amber action row when the
// candidate has to answer. The status is said once, by the pill (round 2): no "Status updated to X" under it.
import { StyleSheet, View } from 'react-native';

import type { Application } from '@/api/schemas/applications';
import { Icon } from '@/components/ui/Icon';
import { LogoTile } from '@/components/ui/LogoTile';
import { pillTones } from '@/components/ui/Pill';
import { PressableScale } from '@/components/ui/PressableScale';
import { AppText } from '@/components/ui/Text';
import { colors, radius, shadows, spacing } from '@/theme/tokens';

import { type ActionKind, candidateAction, formatIndianDate } from '../logic/interview';
import { cardUpdateText, statusLabel, statusTone } from '../logic/status';
import { ProgressSegments } from './ProgressSegments';
import { StatusPill } from './StatusPill';

const ACTION_HINTS: Partial<Record<ActionKind, string>> = {
  interview: 'Respond to your interview invitation',
  documents: 'Documents requested: upload them',
  offer: 'Offer letter received: accept or reject',
};

const CHEVRON = { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' } as const;
const CARD_PRESS_SCALE = 0.99;

export function ApplicationCard({
  application: a,
  onPress,
}: {
  application: Application;
  onPress: () => void;
}) {
  const action = candidateAction(a);
  const hint = action ? ACTION_HINTS[action] : undefined;
  const update = cardUpdateText(a.status);
  // The action row wears the pill's tone (amber = needs you): one meaning per colour across pill, panel and row.
  const tone = pillTones[statusTone(a.status)];
  const place = a.job.city || a.job.location || '';
  const applied = formatIndianDate(a.appliedOn);
  const testID = `application.row.${a.id}`;

  return (
    <PressableScale
      testID={testID}
      pressScale={CARD_PRESS_SCALE}
      accessibilityLabel={`${a.job.role} at ${a.job.hospital}, ${statusLabel(a.status)}.${hint ? ' Action needed.' : ''}`}
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.top}>
        <LogoTile testID={`${testID}.logo`} name={a.job.hospital} uri={a.job.hospitalLogoUrl} size={40} />
        <View style={styles.text}>
          <AppText variant="rowTitle" numberOfLines={2}>
            {a.job.role}
          </AppText>
          <AppText variant="secondary" color="mutedForeground" numberOfLines={1}>
            {place ? `${a.job.hospital} · ${place}` : a.job.hospital}
          </AppText>
          {applied ? (
            <AppText variant="secondary" color="mutedForeground" tabular numberOfLines={1}>
              {`Applied ${applied}`}
            </AppText>
          ) : null}
        </View>
      </View>

      <StatusPill testID={`${testID}.status`} status={a.status} />

      <View style={styles.progress}>
        <ProgressSegments testID={`application.timeline.${a.id}`} status={a.status} />
        {update ? (
          <AppText variant="secondary" color="mutedForeground">
            {update}
          </AppText>
        ) : null}
        {a.joiningDate && ['JoiningConfirmed', 'Joined', 'Onboarded'].includes(a.status) ? (
          <AppText variant="secondary" weight="medium" color="successText" tabular>
            {`Joining on ${formatIndianDate(a.joiningDate)}`}
          </AppText>
        ) : null}
      </View>

      {hint ? (
        <View testID={`${testID}.action`} style={[styles.action, { backgroundColor: colors[tone.bg] }]}>
          <AppText variant="label" color={tone.fg} numberOfLines={2} style={styles.actionText}>
            {hint}
          </AppText>
          <Icon testID={`${testID}.action.chevron`} name={CHEVRON} size={18} tintColor={colors[tone.fg]} />
        </View>
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing['3'],
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    boxShadow: shadows.soft,
    padding: spacing['4'],
    marginHorizontal: spacing['4'],
    marginBottom: spacing['3'],
  },
  top: { flexDirection: 'row', gap: spacing['3'], alignItems: 'flex-start' },
  text: { flexShrink: 1, flexGrow: 1, gap: spacing['0.5'] },
  progress: { gap: spacing['1'] },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2'],
    minHeight: 36,
    paddingHorizontal: spacing['3'],
    paddingVertical: spacing['1'],
    borderRadius: radius.sm,
  },
  actionText: { flex: 1 },
});
