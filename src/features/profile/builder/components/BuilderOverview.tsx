import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { Separator } from '@/components/ui/Separator';
import { AppText } from '@/components/ui/Text';
import { CompletenessRing } from '@/features/profile/components/CompletenessRing';
import { colors, radius, spacing } from '@/theme/tokens';

import type { StepMeta } from '../options';
import type { Readiness } from '../readiness';

const DOWN = { ios: 'chevron.down', android: 'expand_more', web: 'expand_more' } as const;
const UP = { ios: 'chevron.up', android: 'expand_less', web: 'expand_less' } as const;
const CHECK = { ios: 'checkmark', android: 'check', web: 'check' } as const;
const DOT = 6;
const BADGE = 28;

type Props = {
  readiness: Readiness;
  steps: readonly StepMeta[];
  step: number;
  /** A step row was tapped. The website opens any step; Continue and the final save still check them. */
  onOpenStep: (index: number) => void;
};

/**
 * The website wizard's sidebar on a phone: "Application readiness" (score and "Next best fixes") and the step list,
 * in one card at the top of the form. Closed it is one row, so the steps themselves stay uncluttered; open it shows
 * the fixes and every step (done / current / optional), and a tapped step opens and closes the card.
 */
export function BuilderOverview({ readiness, steps, step, onOpenStep }: Props) {
  const [open, setOpen] = useState(false);
  const { score, missing } = readiness;
  return (
    <View testID="builder.overview" style={styles.card}>
      <PressableScale
        testID="builder.overview.toggle"
        accessibilityLabel={`Application readiness, ${score}%`}
        accessibilityHint={open ? 'Hides the steps' : 'Shows the steps and the next best fixes'}
        accessibilityState={{ expanded: open }}
        pressScale={1}
        onPress={() => setOpen((o) => !o)}
        style={styles.toggle}
      >
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <CompletenessRing testID="builder.readiness.ring" percent={score} />
        </View>
        <View style={styles.flex}>
          <AppText variant="caption" color="mutedForeground" numberOfLines={2}>
            Application readiness
          </AppText>
          <AppText testID="builder.readiness.score" variant="rowTitle" tabular numberOfLines={2}>
            {`${score}% ready`}
          </AppText>
        </View>
        <View style={styles.more}>
          <AppText variant="secondary" weight="medium" color="brandText" numberOfLines={1}>
            Steps
          </AppText>
          <Icon name={open ? UP : DOWN} size={20} tintColor={colors.brand} />
        </View>
      </PressableScale>

      {open ? (
        <View testID="builder.overview.body" style={styles.body}>
          {missing.length > 0 ? (
            <View style={styles.fixes}>
              <AppText variant="caption" color="mutedForeground">
                Next best fixes
              </AppText>
              {missing.map((fix, i) => (
                <View key={fix} style={styles.fixRow}>
                  <View style={styles.dot} />
                  <AppText testID={`builder.readiness.fix.${i}`} variant="secondary" style={styles.flex}>
                    {fix}
                  </AppText>
                </View>
              ))}
            </View>
          ) : null}
          <View>
            {steps.map((meta, i) => {
              const done = i < step;
              const current = i === step;
              const state = done ? ', done' : current ? ', current' : meta.optional ? ', optional' : '';
              return (
                <View key={meta.label}>
                  {i > 0 ? <Separator inset={spacing['3'] + BADGE + spacing['3']} /> : null}
                  <PressableScale
                    testID={`builder.steps.${i}`}
                    accessibilityLabel={`Step ${i + 1}, ${meta.label}${state}`}
                    accessibilityState={{ selected: current }}
                    pressScale={1}
                    onPress={() => {
                      setOpen(false);
                      onOpenStep(i);
                    }}
                    style={[styles.stepRow, current && styles.stepCurrent]}
                  >
                    <View
                      style={[styles.badge, done ? styles.badgeDone : current ? styles.badgeCurrent : styles.badgeIdle]}
                    >
                      {done ? (
                        <Icon testID={`builder.steps.${i}.done`} name={CHECK} size={14} tintColor={colors.brandForeground} />
                      ) : (
                        <AppText
                          variant="caption"
                          color={current ? 'primaryForeground' : 'mutedForeground'}
                          tabular
                          maxFontSizeMultiplier={1}
                        >
                          {String(i + 1)}
                        </AppText>
                      )}
                    </View>
                    <AppText
                      variant="secondary"
                      weight={current ? 'semibold' : 'regular'}
                      color={current ? 'brandText' : 'foreground'}
                      numberOfLines={2}
                      style={styles.flex}
                    >
                      {meta.label}
                    </AppText>
                    {meta.optional ? (
                      <AppText variant="caption" color="mutedForeground" numberOfLines={1}>
                        Optional
                      </AppText>
                    ) : null}
                  </PressableScale>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.separator,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['3'],
    padding: spacing['3'],
    minHeight: 72,
  },
  more: { flexDirection: 'row', alignItems: 'center', gap: spacing['0.5'] },
  body: { gap: spacing['3'], paddingBottom: spacing['2'] },
  fixes: {
    gap: spacing['2'],
    marginHorizontal: spacing['3'],
    padding: spacing['3'],
    borderRadius: radius.sm,
    backgroundColor: colors.surface2,
  },
  fixRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing['2'] },
  // Lines the dot up with the first line of 13/18 text.
  dot: { width: DOT, height: DOT, marginTop: (18 - DOT) / 2, borderRadius: radius.full, backgroundColor: colors.brand },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['3'],
    minHeight: 48,
    paddingHorizontal: spacing['3'],
    paddingVertical: spacing['2'],
  },
  stepCurrent: { backgroundColor: colors.brandSoft },
  badge: {
    width: BADGE,
    height: BADGE,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDone: { backgroundColor: colors.brand },
  badgeCurrent: { backgroundColor: colors.navy },
  badgeIdle: { borderWidth: 1, borderColor: colors.separator, backgroundColor: colors.surface },
});
