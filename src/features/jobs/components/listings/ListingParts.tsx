import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Pill, type PillTone } from '@/components/ui/Pill';
import { PressableScale } from '@/components/ui/PressableScale';
import { Skeleton } from '@/components/ui/Skeleton';
import { AppText } from '@/components/ui/Text';
import { colors, ICON_BUTTON, radius, spacing, touchSlop } from '@/theme/tokens';

import { type DeadlineInfo } from '../../logic/deadline';

const DEADLINE_TONE: Record<DeadlineInfo['kind'], PillTone> = {
  none: 'neutral',
  open: 'neutral',
  soon: 'warning',
  expired: 'error',
};

const CALENDAR = { ios: 'calendar', android: 'calendar_today', web: 'calendar_today' } as const;
const EXTERNAL = { ios: 'arrow.up.right.square', android: 'open_in_new', web: 'open_in_new' } as const;
const EXTERNAL_ICON = 22;

export type ListingStat = { id: string; label: string; value: number };

/**
 * D32 stats strip (replaces the navy hero of the gov and international screens): three cells, 22/600 tabular number
 * over a 12-pt muted label, tonal fill, 64 pt. testIDs: `{testID}.stats`, `{testID}.stat.{id}`.
 */
export function StatsStrip({ testID, stats }: { testID: string; stats: readonly ListingStat[] }) {
  return (
    <View testID={`${testID}.stats`} style={styles.strip}>
      {stats.map((s) => (
        <View
          key={s.id}
          accessible
          accessibilityLabel={`${s.value} ${s.label}`}
          accessibilityRole="text"
          style={styles.cell}
        >
          <AppText
            testID={`${testID}.stat.${s.id}`}
            variant="title"
            accessibilityRole="text"
            tabular
            numberOfLines={1}
          >
            {String(s.value)}
          </AppText>
          {/* Capped at 1.15: at font scale 2 "Open-ended" / "With Sponsorship" broke mid-word in a third of 320 pt. */}
          <AppText
            variant="caption"
            color="mutedForeground"
            numberOfLines={2}
            align="center"
            maxFontSizeMultiplier={1.15}
          >
            {s.label}
          </AppText>
        </View>
      ))}
    </View>
  );
}

/**
 * Deadline as a pill (D32): "No deadline" and an open date are neutral, 7 days or fewer is amber with the
 * "{n}d left" badge text in the pill and the date beside it, expired is red ("Expired · date").
 */
export function DeadlinePill({ testID, info }: { testID: string; info: DeadlineInfo }) {
  const tone = DEADLINE_TONE[info.kind];
  return (
    <View style={styles.deadline}>
      <Pill testID={testID} tone={tone} icon={CALENDAR} label={info.badge ?? info.text} tabular />
      {info.badge ? (
        <AppText variant="secondary" color="amberText" tabular numberOfLines={1}>
          {info.text}
        </AppText>
      ) : null}
    </View>
  );
}

/**
 * The row's only action: a 44-pt external-link icon button (the website shows "View / Apply" / "Apply" with an
 * external-link glyph). Muted and disabled once the deadline has passed; the spoken label keeps the website wording.
 */
export function ExternalLinkButton({
  testID,
  accessibilityLabel,
  disabled,
  onPress,
}: {
  testID: string;
  accessibilityLabel: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      pressScale={0.9}
      hitSlop={touchSlop(ICON_BUTTON)}
      onPress={onPress}
      style={styles.link}
    >
      <Icon
        testID={`${testID}.icon`}
        name={EXTERNAL}
        size={EXTERNAL_ICON}
        tintColor={disabled ? colors.placeholder : colors.brand}
      />
    </PressableScale>
  );
}

/**
 * Skeleton rows with the shape of a listing row (eyebrow, title, deadline pill) so nothing jumps when the data
 * lands. One "Loading" announcement for the group; testIDs `{testID}`, `{testID}.{i}`.
 */
export function ListingSkeleton({
  testID,
  count = 3,
  tall,
}: {
  testID: string;
  count?: number;
  tall?: boolean;
}) {
  return (
    <View testID={testID} accessible accessibilityLabel="Loading" accessibilityRole="progressbar">
      {Array.from({ length: count }, (_, i) => (
        <View key={i} testID={`${testID}.${i}`} style={styles.skeletonRow}>
          <View style={styles.skeletonLines}>
            <Skeleton width="65%" height={16} />
            <Skeleton width="45%" height={15} />
            {tall ? <Skeleton width="35%" height={15} /> : null}
            <View style={styles.skeletonPills}>
              <Skeleton width={96} height={22} radius={radius.full} />
              {tall ? <Skeleton width={72} height={22} radius={radius.full} /> : null}
            </View>
          </View>
          <Skeleton width={EXTERNAL_ICON} height={EXTERNAL_ICON} radius={radius.sm} />
        </View>
      ))}
    </View>
  );
}

/** Footer line: "Showing n of m ... listings · Managed by ApronHanger". */
export function ListingFooter({
  testID,
  shown,
  total,
  noun,
}: {
  testID: string;
  shown: number;
  total: number;
  noun: string;
}) {
  return (
    <AppText testID={testID} variant="secondary" color="mutedForeground" align="center" style={styles.footer}>
      {`Showing ${shown} of ${total} ${noun} listings · Managed by ApronHanger`}
    </AppText>
  );
}

/** Shared row frame for the gov and international rows: 16-pt inset, hairline separator, trailing link button. */
export const listingRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing['2'],
    minHeight: 64,
    paddingLeft: spacing['4'],
    paddingRight: spacing['1'],
    paddingVertical: spacing['3'],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
    backgroundColor: colors.background,
  },
  text: { flex: 1, gap: spacing['1'] },
  pills: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing['2'], marginTop: 2 },
});

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    minHeight: 64,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    paddingVertical: spacing['2'],
    paddingHorizontal: spacing['2'],
  },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: spacing['1'] },
  deadline: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing['2'] },
  link: {
    width: ICON_BUTTON,
    height: ICON_BUTTON,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing['3'],
    paddingVertical: spacing['3'],
    paddingHorizontal: spacing['4'],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  skeletonLines: { flex: 1, gap: spacing['2'] },
  skeletonPills: { flexDirection: 'row', gap: spacing['2'] },
  footer: { paddingHorizontal: spacing['4'], paddingTop: spacing['4'], paddingBottom: spacing['2'] },
});
