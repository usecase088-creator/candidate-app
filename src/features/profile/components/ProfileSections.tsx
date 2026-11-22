import { Fragment, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { ListRow } from '@/components/ui/ListRow';
import { Pill, type PillTone } from '@/components/ui/Pill';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Separator } from '@/components/ui/Separator';
import { AppText } from '@/components/ui/Text';
import { useOpenLink } from '@/features/jobs/components/listings/useOpenLink';
import { colors, radius, shadows, spacing } from '@/theme/tokens';

import type { ProfileStat, ProfileView, SectionKey } from '../logic/profileView';

const DOC = { ios: 'doc.text', android: 'description', web: 'description' } as const;
/** Separator inset on document rows: padding 16 + icon 24 + gap 12. */
const DOC_INSET = spacing['4'] + 24 + spacing['3'];

/** Website stats strip (Experience, Procedures, Certifications, Expected CTC, Current CTC): one compact swipeable row. */
export function ProfileStats({ stats }: { stats: ProfileStat[] }) {
  return (
    <ScrollView
      testID="profile.stats"
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.stats}
    >
      {stats.map((s) => (
        <View
          key={s.key}
          testID={`profile.stat.${s.key}`}
          accessible
          accessibilityLabel={`${s.label}: ${s.value}`}
          style={styles.stat}
        >
          <AppText variant="caption" color="mutedForeground" numberOfLines={1}>
            {s.label}
          </AppText>
          <AppText variant="rowTitle" tabular numberOfLines={1}>
            {s.value}
          </AppText>
        </View>
      ))}
    </ScrollView>
  );
}

type Props = { view: ProfileView; onEdit: (section: SectionKey) => void };

/**
 * The website profile's content cards (routes/profile.tsx), in its order: main column, then the side column. Titles and
 * hide rules are the website's; each Edit opens the builder at that section's step.
 */
export function ProfileSections({ view, onEdit }: Props) {
  const d = view.draft;
  const openLink = useOpenLink();
  const id = (key: SectionKey) => `profile.section.${key}`;
  const section = (key: SectionKey, title: string, body: ReactNode) => (
    <View key={key} testID={id(key)}>
      <SectionHeader
        testID={`${id(key)}.header`}
        title={title}
        action={{ label: 'Edit', testID: `${id(key)}.edit`, onPress: () => onEdit(key) }}
      />
      <View style={styles.card}>{body}</View>
    </View>
  );
  const entries = <T,>(key: SectionKey, items: T[], render: (item: T) => ReactNode) =>
    items.map((item, i) => (
      <Fragment key={i}>
        {i > 0 ? <Separator /> : null}
        <View testID={`${id(key)}.${i}`} style={styles.entry}>
          {render(item)}
        </View>
      </Fragment>
    ));
  const chips = (key: SectionKey, values: string[], tone: PillTone) => (
    <View style={styles.chips}>
      {values.map((v, i) => (
        <Pill key={`${i}.${v}`} testID={`${id(key)}.${i}`} label={v} tone={tone} />
      ))}
    </View>
  );
  const availabilityRows = [
    ['Availability / notice period', view.availability],
    ['Availability Status', d.availabilityStatus],
    ['Expected CTC', view.expectedCtc ?? ''],
    ['Current CTC', view.currentCtc ?? ''],
  ].filter(([, value]) => Boolean(value)) as [string, string][];
  const hasAvailability = availabilityRows.length > 0 || d.preferredLocations.length > 0;

  return (
    <View testID="profile.sections">
      {d.summary ? section('about', 'About', <AppText style={styles.pad}>{d.summary}</AppText>) : null}
      {d.experience.length > 0
        ? section(
            'experience',
            'Experience',
            entries('experience', d.experience, (e) => (
              <>
                <AppText variant="rowTitle" numberOfLines={2}>
                  {e.role}
                </AppText>
                <AppText variant="secondary" color="mutedForeground" tabular>
                  {`${e.start} — ${e.current ? 'Present' : e.end}`}
                </AppText>
                <AppText variant="secondary" numberOfLines={2}>
                  {`${e.hospital}${e.city ? ` · ${e.city}` : ''}`}
                </AppText>
                {e.summary ? (
                  <AppText variant="secondary" color="mutedForeground">
                    {e.summary}
                  </AppText>
                ) : null}
              </>
            )),
          )
        : null}
      {d.qualifications.length > 0
        ? section(
            'education',
            'Education',
            entries('education', d.qualifications, (q) => (
              <>
                <AppText variant="rowTitle" numberOfLines={2}>
                  {q.degree}
                </AppText>
                <AppText variant="secondary" numberOfLines={2}>
                  {q.institution}
                </AppText>
                <AppText variant="secondary" color="mutedForeground" tabular>
                  {q.year}
                </AppText>
              </>
            )),
          )
        : null}
      {d.procedures.length > 0
        ? section(
            'procedures',
            'Procedures & volume',
            entries('procedures', d.procedures, (p) => (
              <View style={styles.pair}>
                <AppText style={styles.flex} numberOfLines={2}>
                  {p.name}
                </AppText>
                <AppText weight="semibold" tabular>
                  {String(p.count)}
                </AppText>
              </View>
            )),
          )
        : null}
      {d.certifications.length > 0
        ? section(
            'certifications',
            'Licenses & certifications',
            entries('certifications', d.certifications, (c) => (
              <View style={styles.pair}>
                <View style={styles.flex}>
                  <AppText variant="rowTitle" numberOfLines={2}>
                    {c.name}
                  </AppText>
                  <AppText variant="secondary" color="mutedForeground" numberOfLines={2}>
                    {c.issuer}
                  </AppText>
                </View>
                <AppText variant="secondary" color="mutedForeground" tabular>
                  {c.year}
                </AppText>
              </View>
            )),
          )
        : null}
      {d.publications.length > 0
        ? section(
            'publications',
            'Publications & research',
            entries('publications', d.publications, (pub) => <AppText variant="secondary">{pub}</AppText>),
          )
        : null}
      {view.documents.length > 0
        ? section(
            'documents',
            'Supporting Documents',
            view.documents.map((doc, i) => {
              const name = doc.name || `Document ${i + 1}`;
              return (
                <Fragment key={`${i}.${doc.url}`}>
                  {i > 0 ? <Separator inset={DOC_INSET} /> : null}
                  <ListRow
                    testID={`${id('documents')}.${i}`}
                    title={name}
                    titleNumberOfLines={1}
                    accessibilityLabel={`Open ${name}`}
                    leading={<Icon name={DOC} size={24} tintColor={colors.brand} />}
                    trailing={
                      <AppText variant="label" color="brand">
                        Open
                      </AppText>
                    }
                    onPress={() => openLink(doc.url)}
                  />
                </Fragment>
              );
            }),
          )
        : null}
      {d.registrationNumber || d.registrationCouncil
        ? section(
            'registration',
            'Professional registration',
            <View style={styles.pad}>
              {d.registrationCouncil ? <Field label="Council" value={d.registrationCouncil} /> : null}
              {d.registrationNumber ? <Field label="Reg. number" value={d.registrationNumber} /> : null}
            </View>,
          )
        : null}
      {hasAvailability
        ? section(
            'availability',
            'Availability',
            <View style={styles.pad}>
              {availabilityRows.map(([label, value]) => (
                <Field key={label} label={label} value={value} />
              ))}
              {d.preferredLocations.length > 0 ? (
                <View style={styles.field}>
                  <AppText variant="caption" color="mutedForeground">
                    Preferred Locations
                  </AppText>
                  <View style={styles.chipsInline}>
                    {d.preferredLocations.map((v, i) => (
                      <Pill
                        key={`${i}.${v}`}
                        testID={`${id('availability')}.location.${i}`}
                        label={v}
                        tone="brand"
                      />
                    ))}
                  </View>
                </View>
              ) : null}
            </View>,
          )
        : null}
      {d.clinicalSkills.length > 0
        ? section('clinicalSkills', 'Clinical skills', chips('clinicalSkills', d.clinicalSkills, 'brand'))
        : null}
      {d.technicalSkills.length > 0
        ? section(
            'technicalSkills',
            'Technical skills',
            chips('technicalSkills', d.technicalSkills, 'neutral'),
          )
        : null}
      {d.languages.length > 0
        ? section('languages', 'Languages', chips('languages', d.languages, 'neutral'))
        : null}
    </View>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <AppText variant="caption" color="mutedForeground">
        {label}
      </AppText>
      <AppText tabular>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stats: { gap: spacing['2'], paddingHorizontal: spacing['4'] },
  stat: {
    minWidth: 96,
    gap: spacing['0.5'],
    paddingHorizontal: spacing['3'],
    paddingVertical: spacing['2'],
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    boxShadow: shadows.soft,
  },
  // The one card style (strength card, application cards): white, radius 12, soft shadow, no border.
  card: {
    marginHorizontal: spacing['4'],
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    boxShadow: shadows.soft,
    overflow: 'hidden',
  },
  pad: { padding: spacing['4'], gap: spacing['3'] },
  entry: { gap: spacing['0.5'], paddingHorizontal: spacing['4'], paddingVertical: spacing['3'] },
  pair: { flexDirection: 'row', alignItems: 'center', gap: spacing['3'] },
  field: { gap: spacing['0.5'] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing['2'], padding: spacing['4'] },
  chipsInline: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing['2'], paddingTop: spacing['1'] },
});
