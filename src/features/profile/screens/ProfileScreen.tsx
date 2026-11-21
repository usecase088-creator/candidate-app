import { useRouter } from 'expo-router';
import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Icon } from '@/components/ui/Icon';
import { ListGroup } from '@/components/ui/ListGroup';
import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { Separator } from '@/components/ui/Separator';
import { Skeleton } from '@/components/ui/Skeleton';
import { AppText } from '@/components/ui/Text';
import { queryView } from '@/features/jobs/hooks/queryView';
import { useSession } from '@/features/auth/sessionStore';
import { colors, radius, spacing } from '@/theme/tokens';

import { nextBestFixes, type ProfileJson } from '../builder/model';
import { AvatarSection } from '../components/AvatarSection';
import { CompletenessRing } from '../components/CompletenessRing';
import { useCandidateMe } from '../hooks/useCandidateMe';

const ICONS = {
  edit: { ios: 'pencil', android: 'edit', web: 'edit' },
  cv: { ios: 'doc.text', android: 'description', web: 'description' },
  settings: { ios: 'gearshape', android: 'settings', web: 'settings' },
  signOut: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' },
  fix: { ios: 'plus.circle', android: 'add_circle', web: 'add_circle' },
} as const;
const ICON_SIZE = 24;
/** Separator inset on rows with a 24-pt leading icon: padding 16 + icon 24 + gap 12. */
const ROW_INSET = spacing['4'] + ICON_SIZE + spacing['3'];

/**
 * Profile tab (D32): hero (avatar, name, headline, email), a strength card with the completeness ring and the next
 * best fixes, then two grouped lists: Profile (Edit profile, My CV) and Account (Settings, Sign out). The lists stay
 * on screen while the profile loads or fails, so Sign out is always one tap away.
 */
export function ProfileScreen() {
  const router = useRouter();
  const signOut = useSession((s) => s.signOut);
  const query = useCandidateMe();
  const view = queryView(query);
  const me = query.data;
  const profile = (me?.profile ?? null) as ProfileJson | null;
  const name = String(profile?.name ?? me?.name ?? '');
  const headline = typeof profile?.headline === 'string' ? profile.headline : '';
  const completeness = Math.round(Number(profile?.completeness ?? 0));
  const fixes = profile ? nextBestFixes(profile) : [];
  const openBuilder = () => router.push('/profile-builder');
  // First time (nothing filled yet): the one filled CTA lives in the strength card instead of a row.
  const heroCta = view === 'ready' && completeness === 0;

  return (
    <Screen testID="profile.screen" edges={[]} scroll padded={false}>
      {view === 'loading' && (
        <View testID="profile.loading" accessible accessibilityLabel="Loading" style={styles.hero}>
          <Skeleton width={88} height={88} radius={radius.full} />
          <Skeleton width={180} height={22} />
          <Skeleton width={220} height={13} />
        </View>
      )}
      {(view === 'error' || view === 'offline') && (
        <ErrorState
          testID="profile.error"
          message={view === 'offline' ? "You're offline." : 'We could not load your profile.'}
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      )}
      {view === 'ready' && me && (
        <>
          <View style={styles.hero}>
            <AvatarSection avatarUrl={me.avatarUrl} name={name} />
            <View style={styles.identity}>
              <AppText testID="profile.name" variant="title" align="center" numberOfLines={2}>
                {name}
              </AppText>
              {headline ? (
                <AppText
                  testID="profile.headline"
                  variant="secondary"
                  color="mutedForeground"
                  align="center"
                  numberOfLines={2}
                >
                  {headline}
                </AppText>
              ) : null}
              <AppText
                testID="profile.email"
                variant="secondary"
                color="mutedForeground"
                align="center"
                numberOfLines={1}
              >
                {me.email ?? ''}
              </AppText>
            </View>
          </View>

          <View testID="profile.strength" style={styles.strength}>
            <View style={styles.strengthRow}>
              <CompletenessRing testID="profile.completeness" percent={completeness} />
              <View style={styles.strengthText}>
                <AppText variant="rowTitle">Profile strength</AppText>
                <AppText variant="secondary" color="mutedForeground">
                  {completeness >= 100
                    ? 'Your profile is complete.'
                    : completeness === 0
                      ? 'Hospitals see your profile first. Build it once, apply everywhere.'
                      : 'Add the items below to reach 100%.'}
                </AppText>
              </View>
            </View>
            {heroCta ? <Button testID="profile.edit" label="Build my profile" onPress={openBuilder} /> : null}
            {!heroCta && fixes.length > 0 ? (
              <View testID="profile.fixes" style={styles.fixes}>
                <Separator />
                {fixes.map((fix, i) => (
                  <Fragment key={fix}>
                    {i > 0 ? <Separator inset={ROW_INSET} /> : null}
                    <ListRow
                      testID={`profile.fixes.${i}`}
                      title={fix}
                      titleNumberOfLines={2}
                      leading={<Icon name={ICONS.fix} size={ICON_SIZE} tintColor={colors.brand} />}
                      onPress={openBuilder}
                    />
                  </Fragment>
                ))}
              </View>
            ) : null}
          </View>
        </>
      )}

      <ListGroup testID="profile.group.profile" header="Profile" separatorInset={ROW_INSET}>
        {!heroCta ? (
          <ListRow
            testID="profile.edit"
            title={completeness > 0 ? 'Edit profile' : 'Build my profile'}
            leading={<Icon name={ICONS.edit} size={ICON_SIZE} tintColor={colors.brand} />}
            onPress={openBuilder}
          />
        ) : null}
        <ListRow
          testID="profile.cv"
          title="My CV"
          leading={<Icon name={ICONS.cv} size={ICON_SIZE} tintColor={colors.brand} />}
          onPress={() => router.push('/cv-preview')}
        />
      </ListGroup>
      <ListGroup testID="profile.group.account" header="Account" separatorInset={ROW_INSET}>
        <ListRow
          testID="profile.settings"
          title="Settings"
          leading={<Icon name={ICONS.settings} size={ICON_SIZE} tintColor={colors.brand} />}
          onPress={() => router.push('/settings')}
        />
        <ListRow
          testID="profile.signout"
          title="Sign out"
          leading={<Icon name={ICONS.signOut} size={ICON_SIZE} tintColor={colors.mutedForeground} />}
          trailing="none"
          onPress={() => void signOut('user')}
        />
      </ListGroup>
      <View style={styles.bottom} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: spacing['3'],
    paddingTop: spacing['6'],
    paddingHorizontal: spacing['5'],
  },
  identity: { alignSelf: 'stretch', alignItems: 'center', gap: spacing['1'] },
  strength: {
    marginTop: spacing['6'],
    marginHorizontal: spacing['4'],
    padding: spacing['4'],
    gap: spacing['4'],
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.separator,
  },
  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: spacing['4'] },
  strengthText: { flex: 1, gap: spacing['0.5'] },
  // Rows sit inside the card: pull them to its edges so the pressed state and separators run full width.
  fixes: { marginHorizontal: -spacing['4'], marginBottom: -spacing['4'], paddingTop: spacing['1'] },
  bottom: { height: spacing['8'] },
});
