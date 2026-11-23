import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/Text';
import { colors, radius, spacing } from '@/theme/tokens';

import type { ProfileJson } from '../model';

const MAX_EXPERIENCE = 2;
const MAX_SKILLS = 3;

const text = (v: unknown) => (typeof v === 'string' ? v : '');
const rows = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null) : [];
const words = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

/**
 * Website CvMiniPreview: the CV the form will make, in small (name, headline, the first two positions, three
 * clinical skills) on the navy card. `profile` is the form as it would be saved (profileFromDraft).
 */
export function CvMiniPreview({ testID, profile }: { testID: string; profile: ProfileJson }) {
  const experience = rows(profile.experience).slice(0, MAX_EXPERIENCE);
  const skills = words(profile.clinicalSkills).slice(0, MAX_SKILLS);
  const headline = text(profile.headline);
  return (
    <View testID={testID} style={styles.card}>
      <AppText testID={`${testID}.name`} variant="rowTitle" color="primaryForeground" numberOfLines={2}>
        {text(profile.name)}
      </AppText>
      {headline ? (
        <AppText testID={`${testID}.headline`} variant="secondary" color="primaryForegroundMuted" numberOfLines={2}>
          {headline}
        </AppText>
      ) : null}
      {experience.length > 0 ? (
        <View style={styles.list}>
          {experience.map((e, i) => (
            <View key={i} testID={`${testID}.experience.${i}`} style={styles.position}>
              <AppText variant="secondary" weight="semibold" color="primaryForeground" numberOfLines={1}>
                {text(e.role)}
              </AppText>
              <AppText variant="caption" color="primaryForegroundMuted" numberOfLines={1}>
                {text(e.hospital)}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}
      {skills.length > 0 ? (
        <View style={styles.skills}>
          {skills.map((s, i) => (
            <View key={s} style={styles.skill}>
              <AppText testID={`${testID}.skill.${i}`} variant="caption" color="primaryForeground" numberOfLines={1}>
                {s}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing['1'],
    padding: spacing['4'],
    borderRadius: radius.md,
    backgroundColor: colors.navy,
  },
  list: { gap: spacing['2'], marginTop: spacing['3'] },
  position: {
    gap: spacing['0.5'],
    paddingHorizontal: spacing['3'],
    paddingVertical: spacing['2'],
    borderRadius: radius.sm,
    backgroundColor: colors.primaryForegroundTint,
  },
  skills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing['1'], marginTop: spacing['3'] },
  skill: {
    maxWidth: '100%',
    paddingHorizontal: spacing['2'],
    paddingVertical: spacing['0.5'],
    borderRadius: radius.full,
    backgroundColor: colors.primaryForegroundTint,
  },
});
