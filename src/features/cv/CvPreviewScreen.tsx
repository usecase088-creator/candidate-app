// Website routes/cv-preview.tsx: the generated CV, "Download PDF", "Edit CV", and the two special cases (no CV yet,
// an uploaded CV document only).
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { AppText } from '@/components/ui/Text';
import { queryView } from '@/features/jobs/hooks/queryView';
import { useCandidateMe } from '@/features/profile/hooks/useCandidateMe';
import { isOpenableLink } from '@/features/jobs/logic/deadline';
import { colors, radius, spacing } from '@/theme/tokens';

import { buildCv, type CvItem } from './cvModel';
import { shareCvPdf } from './cvPdf';

export function CvPreviewScreen() {
  const router = useRouter();
  const query = useCandidateMe();
  const view = queryView(query);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const me = query.data;
  const profile = (me?.profile ?? null) as Record<string, unknown> | null;
  const build = () => router.push('/profile-builder');
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/profile'));
  const openDocument = () => {
    if (me?.cvUrl && isOpenableLink(me.cvUrl)) void WebBrowser.openBrowserAsync(me.cvUrl);
  };

  const back = (
    <Button
      testID="cv.back"
      label="← Back"
      accessibilityLabel="Back"
      variant="ghost"
      fullWidth={false}
      onPress={goBack}
    />
  );

  async function download() {
    if (!profile) return;
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
    body = <Skeleton testID="cv.loading" width="100%" height={160} />;
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
          <Button testID="cv.build" label="Switch to Form CV" variant="outline" onPress={build} />
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
        <Button testID="cv.build" label="Switch to Form CV" variant="outline" onPress={build} />
      </Centered>
    );
  } else {
    const cv = buildCv(profile);
    body = (
      <View style={styles.stack}>
        <AppText variant="caption" color="mutedForeground">
          Generated CV
        </AppText>
        <AppText variant="title" accessibilityRole="header">
          Your professional profile
        </AppText>
        <Button
          testID="cv.pdf"
          label="Download PDF"
          loading={busy}
          disabled={busy}
          onPress={() => void download()}
        />
        {me?.cvUrl ? (
          <Button testID="cv.document" label="Attached Document" variant="outline" onPress={openDocument} />
        ) : null}
        <Button testID="cv.edit" label="Edit CV" variant="outline" onPress={build} />
        {error ? (
          <AppText testID="cv.error" color="errorText" accessibilityLiveRegion="polite">
            {error}
          </AppText>
        ) : null}

        <View style={styles.header}>
          <AppText testID="cv.name" variant="heading" color="primaryForeground">
            {cv.name}
          </AppText>
          {cv.titleLine ? <AppText color="primaryForeground">{cv.titleLine}</AppText> : null}
          {cv.summary ? <AppText color="primaryForeground">{cv.summary}</AppText> : null}
          {cv.contact.map((c) => (
            <AppText key={c} variant="caption" color="primaryForeground">
              {c}
            </AppText>
          ))}
        </View>
        <View style={styles.metrics}>
          {cv.metrics.map(([k, v]) => (
            <View key={k} style={styles.metric}>
              <AppText weight="semibold">{v}</AppText>
              <AppText variant="caption" color="mutedForeground">
                {k}
              </AppText>
            </View>
          ))}
        </View>
        {cv.sections.map((s) => (
          <View key={s.title} style={styles.stack}>
            <AppText variant="heading" accessibilityRole="header">
              {s.title}
            </AppText>
            {s.items.map((item, i) => (
              <Item key={`${s.title}.${i}`} item={item} />
            ))}
          </View>
        ))}
      </View>
    );
  }

  return (
    <Screen testID="cv.screen" scroll>
      <View style={styles.stack}>
        {back}
        {body}
      </View>
    </Screen>
  );
}

function Centered({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <View style={styles.stack}>
      <AppText variant="title" accessibilityRole="header">
        {title}
      </AppText>
      <AppText color="mutedForeground">{note}</AppText>
      {children}
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
            <AppText variant="caption" color="primary">
              {item.tag}
            </AppText>
          ) : null}
        </View>
      ) : null}
      {item.sub ? <AppText color="mutedForeground">{item.sub}</AppText> : null}
      {item.body ? <AppText color="mutedForeground">{item.body}</AppText> : null}
      {item.chips && item.chips.length > 0 ? (
        <View style={styles.chips}>
          {item.chips.map((c) => (
            <View key={c} style={styles.chip}>
              <AppText variant="caption">{c}</AppText>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing['3'] },
  flex: { flex: 1 },
  header: {
    gap: spacing['1'],
    padding: spacing['4'],
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
  },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing['2'] },
  metric: {
    flexGrow: 1,
    minWidth: 120,
    padding: spacing['3'],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  item: {
    gap: spacing['1'],
    padding: spacing['3'],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing['2'] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing['1'] },
  chip: {
    paddingHorizontal: spacing['2'],
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
  },
});
