import { useRouter } from 'expo-router';
import { Fragment } from 'react';
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
import { useSession } from '@/features/auth/sessionStore';
import { colors, radius, shadows, spacing } from '@/theme/tokens';

import { type ProfileJson } from '../builder/model';
import { AvatarSection } from '../components/AvatarSection';
import { CompletenessRing } from '../components/CompletenessRing';
import { ProfileSections, ProfileStats } from '../components/ProfileSections';
import { profileChecklist } from '../logic/profileChecklist';
import { profileView, SECTION_STEP, type SectionKey } from '../logic/profileView';
import { useCandidateMe } from '../hooks/useCandidateMe';

const ICONS = {
  edit: { ios: 'pencil', android: 'edit', web: 'edit' },
  cv: { ios: 'doc.text', android: 'description', web: 'description' },
  settings: { ios: 'gearshape', android: 'settings', web: 'settings' },
  signOut: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' },
  done: { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' },
  todo: { ios: 'circle', android: 'radio_button_unchecked', web: 'radio_button_unchecked' },
  verified: { ios: 'checkmark.shield', android: 'verified_user', web: 'verified_user' },
} as const;
const ICON_SIZE = 24;
/** Separator inset on rows with a 24-pt leading icon: padding 16 + icon 24 + gap 12. */
const ROW_INSET = spacing['4'] + ICON_SIZE + spacing['3'];

/**
 * Profile tab (D32): hero (avatar, name, headline, the website's verified badge, location, email, phone), the website
 * stats strip, the website strength card (completeness ring, "x of y complete", the eight-item checklist whose
 * open items open the builder at their step, and "Complete profile" under 100%), the website profile sections
 * (About ... Languages, each with Edit), then two grouped lists: Profile (Edit profile, My CV) and Account (Settings,
 * Sign out). With no profile yet the website empty state replaces the strength card and the sections. The lists stay
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
  const checklist = profile ? profileChecklist(profile) : [];
  const doneCount = checklist.filter((item) => item.done).length;
  const openBuilder = () => router.push('/profile-builder');
  const openStep = (step: number) => router.push({ pathname: '/profile-builder', params: { step: String(step) } });
  const editSection = (key: SectionKey) => openStep(SECTION_STEP[key]);
  // M4: no profile yet (website "Your CV hasn't been built yet"): the one filled CTA lives in the empty card.
  const heroCta = view === 'ready' && !profile;
  const details = me && profile ? profileView(me) : null;

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
              {details?.verified ? (
                <View style={styles.badge}>
                  <Pill
                    testID="profile.verified"
                    label={details.verified}
                    tone="brand"
                    icon={ICONS.verified}
                  />
                </View>
              ) : null}
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
              {details?.location ? (
                <AppText
                  testID="profile.location"
                  variant="secondary"
                  color="mutedForeground"
                  align="center"
                  numberOfLines={1}
                >
                  {details.location}
                </AppText>
              ) : null}
              {details?.phone ? (
                <AppText
                  testID="profile.phone"
                  variant="secondary"
                  color="mutedForeground"
                  align="center"
                  numberOfLines={1}
                  tabular
                >
                  {details.phone}
                </AppText>
              ) : null}
            </View>
          </View>

          {details ? (
            <View style={styles.statsWrap}>
              <ProfileStats stats={details.stats} />
            </View>
          ) : null}

          {heroCta ? (
            <View testID="profile.strength" style={styles.strength}>
              <View testID="profile.empty" style={styles.empty}>
                <AppText variant="heading" align="center" accessibilityRole="header">
                  Your CV hasn&apos;t been built yet
                </AppText>
                <AppText variant="secondary" color="mutedForeground" align="center">
                  ApronHanger builds your professional CV from a single structured form. Once it&apos;s done,
                  you can Quick Apply to any verified role with one tap.
                </AppText>
              </View>
              <Button testID="profile.edit" label="Build my CV" onPress={openBuilder} />
            </View>
          ) : (
            <View testID="profile.strength" style={styles.strength}>
              <View style={styles.strengthRow}>
                <CompletenessRing testID="profile.completeness" percent={completeness} />
                <View style={styles.strengthText}>
                  <AppText variant="rowTitle">Profile strength</AppText>
                  <AppText testID="profile.strength.subtitle" variant="secondary" color="mutedForeground">
                    {`${doneCount} of ${checklist.length} complete`}
                  </AppText>
                </View>
              </View>
              {/* Website ProfileStrengthCard: every item, a check when done, an empty circle when not. */}
              <View testID="profile.checklist" style={styles.checklist}>
                <Separator />
                {checklist.map((item, i) => (
                  <Fragment key={item.key}>
                    {i > 0 ? <Separator inset={ROW_INSET} /> : null}
                    <ListRow
                      testID={`profile.checklist.${i}`}
                      title={item.label}
                      accessibilityLabel={`${item.label}, ${item.done ? 'complete' : 'not complete'}`}
                      accessibilityRole={item.done ? 'text' : 'button'}
                      accessibilityHint={item.done ? undefined : 'Opens the profile builder'}
                      leading={
                        <Icon
                          testID={`profile.checklist.${i}.icon`}
                          name={item.done ? ICONS.done : ICONS.todo}
                          size={ICON_SIZE}
                          tintColor={item.done ? colors.brand : colors.mutedForeground}
                        />
                      }
                      onPress={item.done ? undefined : () => openStep(item.step)}
                    />
                  </Fragment>
                ))}
              </View>
              {completeness < 100 ? (
                <Button
                  testID="profile.strength.complete"
                  label="Complete profile"
                  variant="secondary"
                  size="md"
                  fullWidth
                  onPress={openBuilder}
                />
              ) : null}
            </View>
          )}
          {details ? <ProfileSections view={details} onEdit={editSection} /> : null}
        </>
      )}

      <ListGroup testID="profile.group.profile" header="Profile" separatorInset={ROW_INSET}>
        {!heroCta ? (
          <ListRow
            testID="profile.edit"
            title="Edit profile"
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
    gap: spacing['2'],
    paddingTop: spacing['6'],
    paddingHorizontal: spacing['5'],
  },
  identity: { alignSelf: 'stretch', alignItems: 'center', gap: spacing['1'] },
  badge: { maxWidth: '100%' },
  statsWrap: { marginTop: spacing['4'], marginBottom: -spacing['2'] },
  empty: { gap: spacing['2'] },
  strength: {
    marginTop: spacing['6'],
    marginHorizontal: spacing['4'],
    padding: spacing['4'],
    gap: spacing['4'],
    // D32 R2 (issue 13): the one card style (as the application cards): white, radius 12, soft shadow, no border.
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    boxShadow: shadows.soft,
  },
  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: spacing['4'] },
  strengthText: { flex: 1, gap: spacing['0.5'] },
  // Rows sit inside the card: pull them to its edges so the pressed state and separators run full width.
  checklist: { marginHorizontal: -spacing['4'], paddingTop: spacing['1'] },
  bottom: { height: spacing['8'] },
});
