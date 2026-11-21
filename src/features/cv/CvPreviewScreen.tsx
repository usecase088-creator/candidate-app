// Website routes/cv-preview.tsx: the generated CV, "Download PDF", "Edit CV", and the two special cases (no CV yet,
// an uploaded CV document only). D32: actions as grouped rows, one CV card with a navy header, flat sections.
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Fragment, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Icon } from '@/components/ui/Icon';
import { ListGroup } from '@/components/ui/ListGroup';
import { ListRow } from '@/components/ui/ListRow';
import { Pill } from '@/components/ui/Pill';
import { Screen } from '@/components/ui/Screen';
import { Separator } from '@/components/ui/Separator';
import { Skeleton } from '@/components/ui/Skeleton';
import { AppText } from '@/components/ui/Text';
import { queryView } from '@/features/jobs/hooks/queryView';
import { useCandidateMe } from '@/features/profile/hooks/useCandidateMe';
import { isOpenableLink } from '@/features/jobs/logic/deadline';
import { colors, radius, spacing } from '@/theme/tokens';

import { buildCv, type CvItem } from './cvModel';
import { shareCvPdf } from './cvPdf';

const ICONS = {
  pdf: { ios: 'square.and.arrow.up', android: 'share', web: 'share' },
  document: { ios: 'doc.text', android: 'description', web: 'description' },
  edit: { ios: 'pencil', android: 'edit', web: 'edit' },
  external: { ios: 'arrow.up.right', android: 'open_in_new', web: 'open_in_new' },
} as const;
const ICON_SIZE = 24;
const ROW_INSET = spacing['4'] + ICON_SIZE + spacing['3'];

export function CvPreviewScreen() {
  const router = useRouter();
  const query = useCandidateMe();
  const view = queryView(query);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const me = query.data;
  const profile = (me?.profile ?? null) as Record<string, unknown> | null;
  const build = () => router.push('/profile-builder');
  const openDocument = () => {
    if (me?.cvUrl && isOpenableLink(me.cvUrl)) void WebBrowser.openBrowserAsync(me.cvUrl);
  };

  async function download() {
    if (!profile || busy) return;
    setError(undefined);
    setBusy(true);
    const result = await shareCvPdf(profile);
    setBusy(false);
    if (!result.ok) {
      setError(
        result.reason === 'unavailable'
          ? 'Sharing is not available on this phone.'
          : 'Could not make the PDF. Please try again.',
      );
    }
  }

  let body;
  if (view === 'loading') {
    body = (
      <View testID="cv.loading" accessible accessibilityLabel="Loading" style={styles.padded}>
        <Skeleton width="100%" height={52} radius={radius.md} />
        <Skeleton width="100%" height={160} radius={radius.md} />
      </View>
    );
  } else if (view === 'error' || view === 'offline') {
    body = (
      <ErrorState
        testID="cv.loadError"
        message={view === 'offline' ? "You're offline." : 'We could not load your CV.'}
        onRetry={() => void query.refetch()}
        retrying={query.isFetching}
      />
    );
  } else if (!profile) {
    body =
      me?.cvSource === 'upload' && me.uploadedCvName ? (
        <Centered
          title="You've uploaded a CV"
          note={`Your CV document ${me.uploadedCvName} has been uploaded and will be sent with your applications.`}
        >
          {me.cvUrl ? <Button testID="cv.document" label="Download Document" onPress={openDocument} /> : null}
          <Button testID="cv.build" label="Switch to Form CV" variant="secondary" onPress={build} />
        </Centered>
      ) : (
        <Centered
          title="No CV yet"
          note="Your ApronHanger CV is generated from the form. Fill it once and it'll be ready for every Quick Apply."
        >
          <Button testID="cv.build" label="Build my CV" onPress={build} />
        </Centered>
      );
  } else if (
    me?.cvSource === 'upload' &&
    !Array.isArray(profile.experience) &&
    !Array.isArray(profile.qualifications)
  ) {
    body = (
      <Centered
        title="You've uploaded a CV"
        note={`Your CV document ${me.uploadedCvName ?? ''} has been uploaded.`}
      >
        <Button testID="cv.build" label="Switch to Form CV" variant="secondary" onPress={build} />
      </Centered>
    );
  } else {
    const cv = buildCv(profile);
    body = (
      <>
        <ListGroup testID="cv.actions" separatorInset={ROW_INSET}>
          <ListRow
            testID="cv.pdf"
            title="Download PDF"
            value={busy ? 'Preparing…' : undefined}
            leading={<Icon name={ICONS.pdf} size={ICON_SIZE} tintColor={colors.brand} />}
            onPress={() => void download()}
          />
          {me?.cvUrl ? (
            <ListRow
              testID="cv.document"
              title="Attached Document"
              leading={<Icon name={ICONS.document} size={ICON_SIZE} tintColor={colors.brand} />}
              trailing={<Icon name={ICONS.external} size={18} tintColor={colors.mutedForeground} />}
              onPress={openDocument}
            />
          ) : null}
          <ListRow
            testID="cv.edit"
            title="Edit CV"
            leading={<Icon name={ICONS.edit} size={ICON_SIZE} tintColor={colors.brand} />}
            onPress={build}
          />
        </ListGroup>
        {error ? (
          <AppText
            testID="cv.error"
            variant="secondary"
            color="errorText"
            accessibilityLiveRegion="polite"
            style={styles.error}
          >
            {error}
          </AppText>
        ) : null}

        <View style={styles.card}>
          <View style={styles.header}>
            <AppText testID="cv.name" variant="title" color="primaryForeground" numberOfLines={2}>
              {cv.name}
            </AppText>
            {cv.titleLine ? (
              <AppText variant="secondary" color="primaryForeground">
                {cv.titleLine}
              </AppText>
            ) : null}
            {cv.summary ? (
              <AppText variant="secondary" color="primaryForeground" style={styles.summary}>
                {cv.summary}
              </AppText>
            ) : null}
            <View style={styles.contacts}>
              {cv.contact.map((c) => (
                <AppText key={c} variant="caption" color="primaryForeground" numberOfLines={1}>
                  {c}
                </AppText>
              ))}
            </View>
          </View>
          {cv.metrics.length > 0 ? (
            <View style={styles.metrics}>
              {cv.metrics.map(([k, v], i) => (
                <View key={k} style={[styles.metric, i > 0 && styles.metricDivider]}>
                  <AppText variant="heading" tabular numberOfLines={1}>
                    {v}
                  </AppText>
                  <AppText variant="caption" color="mutedForeground" numberOfLines={1}>
                    {k}
                  </AppText>
                </View>
              ))}
            </View>
          ) : null}
          {cv.sections.map((s) => (
            <View key={s.title} style={styles.section}>
              <AppText variant="heading" style={styles.sectionTitle}>
                {s.title}
              </AppText>
              {s.items.map((item, i) => (
                <Fragment key={`${s.title}.${i}`}>
                  {i > 0 ? <Separator /> : null}
                  <Item item={item} />
                </Fragment>
              ))}
            </View>
          ))}
        </View>
      </>
    );
  }

  return (
    <Screen testID="cv.screen" scroll padded={false}>
      {body}
      <View style={styles.bottom} />
    </Screen>
  );
}

function Centered({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <View style={styles.padded}>
      <AppText variant="title" accessibilityRole="header">
        {title}
      </AppText>
      <AppText color="mutedForeground">{note}</AppText>
      <View style={styles.ctas}>{children}</View>
    </View>
  );
}

function Item({ item }: { item: CvItem }) {
  return (
    <View style={styles.item}>
      {item.heading || item.tag ? (
        <View style={styles.row}>
          <AppText weight="semibold" style={styles.flex}>
            {item.heading}
          </AppText>
          {item.tag ? (
            <AppText variant="caption" color="brand" tabular>
              {item.tag}
            </AppText>
          ) : null}
        </View>
      ) : null}
      {item.sub ? (
        <AppText variant="secondary" color="mutedForeground">
          {item.sub}
        </AppText>
      ) : null}
      {item.body ? (
        <AppText variant="secondary" color="mutedForeground">
          {item.body}
        </AppText>
      ) : null}
      {item.chips && item.chips.length > 0 ? (
        <View style={styles.chips}>
          {item.chips.map((c) => (
            <Pill key={c} testID={`cv.chip.${c}`} label={c} tone="neutral" />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  padded: { padding: spacing['4'], gap: spacing['3'] },
  ctas: { gap: spacing['2'], paddingTop: spacing['2'] },
  error: { paddingHorizontal: spacing['4'], paddingTop: spacing['2'] },
  card: {
    marginTop: spacing['4'],
    marginHorizontal: spacing['4'],
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.separator,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  header: { gap: spacing['1'], padding: spacing['5'], backgroundColor: colors.primary },
  summary: { paddingTop: spacing['2'] },
  contacts: { paddingTop: spacing['2'], gap: spacing['0.5'] },
  metrics: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  metric: { flex: 1, alignItems: 'center', gap: spacing['0.5'], paddingVertical: spacing['3'] },
  metricDivider: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.separator },
  section: { paddingHorizontal: spacing['4'], paddingBottom: spacing['2'] },
  sectionTitle: { paddingTop: spacing['6'], paddingBottom: spacing['2'] },
  item: { gap: spacing['1'], paddingVertical: spacing['3'] },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing['2'] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing['1'], paddingTop: spacing['1'] },
  bottom: { height: spacing['8'] },
});
