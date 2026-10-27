// One application in the list (website: the row in routes/applications.tsx). The whole card opens the application,
// where the hospital's questions are answered: long forms inside a recycled list lose what was typed (D27).
import { Pressable, StyleSheet, View } from 'react-native';

import type { Application } from '@/api/schemas/applications';
import { AppText } from '@/components/ui/Text';
import { HospitalLogo } from '@/features/jobs/components/HospitalLogo';
import { colors, MIN_TOUCH, radius, spacing } from '@/theme/tokens';

import { type ActionKind, candidateAction, formatIndianDate } from '../logic/interview';
import { lastUpdateText, statusLabel } from '../logic/status';
import { StatusPill } from './StatusPill';
import { Timeline } from './Timeline';

const ACTION_HINTS: Partial<Record<ActionKind, string>> = {
  interview: 'Respond to your interview invitation',
  documents: 'Documents requested: upload them',
  offer: 'Offer letter received: accept or reject',
};

export function ApplicationCard({
  application: a,
  onPress,
}: {
  application: Application;
  onPress: () => void;
}) {
  const action = candidateAction(a);
  const hint = action ? ACTION_HINTS[action] : undefined;
  const place = a.job.city || a.job.location || '';
  const applied = formatIndianDate(a.appliedOn);

  return (
    <Pressable
      testID={`application.row.${a.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${a.job.role} at ${a.job.hospital}, ${statusLabel(a.status)}.${hint ? ' Action needed.' : ''}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.top}>
        <HospitalLogo uri={a.job.hospitalLogoUrl} size={44} />
        <View style={styles.text}>
          <AppText variant="label" weight="semibold">
            {a.job.role}
          </AppText>
          <AppText variant="caption" color="mutedForeground">
            {place ? `${a.job.hospital} · ${place}` : a.job.hospital}
          </AppText>
          {applied ? (
            <AppText variant="caption" color="mutedForeground">
              {`Applied ${applied}`}
            </AppText>
          ) : null}
        </View>
      </View>

      <StatusPill status={a.status} />
      <Timeline testID={`application.timeline.${a.id}`} status={a.status} />
      <AppText variant="caption" color="mutedForeground">
        {lastUpdateText(a.status)}
      </AppText>
      {a.joiningDate && ['JoiningConfirmed', 'Joined', 'Onboarded'].includes(a.status) ? (
        <AppText variant="caption" weight="medium" color="emeraldText">
          {`Joining on ${formatIndianDate(a.joiningDate)}`}
        </AppText>
      ) : null}
      {hint ? (
        <View style={styles.hint}>
          <AppText variant="caption" weight="semibold" color="brand">
            {hint}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing['3'],
    minHeight: MIN_TOUCH,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing['4'],
    marginBottom: spacing['3'],
  },
  pressed: { opacity: 0.85 },
  top: { flexDirection: 'row', gap: spacing['3'], alignItems: 'flex-start' },
  text: { flexShrink: 1, flexGrow: 1, gap: spacing['0.5'] },
  hint: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing['2'] },
});
