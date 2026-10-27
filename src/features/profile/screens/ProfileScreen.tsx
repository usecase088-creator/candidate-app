import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { AppText } from '@/components/ui/Text';
import { queryView } from '@/features/jobs/hooks/queryView';
import { useSession } from '@/features/auth/sessionStore';
import { spacing } from '@/theme/tokens';

import { useCandidateMe } from '../hooks/useCandidateMe';

/** Profile tab: who you are, how complete the profile is, and the way to Settings. Sign out stays one tap away. */
export function ProfileScreen() {
  const router = useRouter();
  const signOut = useSession((s) => s.signOut);
  const query = useCandidateMe();
  const view = queryView(query);
  const me = query.data;
  const name = me?.profile?.name ?? me?.name ?? '';
  const completeness = Math.round(me?.profile?.completeness ?? 0);

  return (
    <Screen testID="profile.screen" edges={['top']} scroll>
      <View style={styles.stack}>
        <AppText variant="title" accessibilityRole="header">
          Profile
        </AppText>
        {view === 'loading' && <Skeleton testID="profile.loading" width="100%" height={72} />}
        {(view === 'error' || view === 'offline') && (
          <ErrorState
            testID="profile.error"
            message={view === 'offline' ? "You're offline." : 'We could not load your profile.'}
            onRetry={() => void query.refetch()}
            retrying={query.isFetching}
          />
        )}
        {view === 'ready' && me && (
          <View style={styles.card}>
            <AppText testID="profile.name" variant="heading">
              {String(name)}
            </AppText>
            <AppText testID="profile.email" color="mutedForeground">
              {me.email ?? ''}
            </AppText>
            <AppText testID="profile.completeness">{`Profile completeness: ${completeness}%`}</AppText>
          </View>
        )}
        <Button
          testID="profile.settings"
          label="Settings"
          variant="outline"
          onPress={() => router.push('/settings')}
        />
        <Button
          testID="profile.signout"
          label="Sign out"
          variant="outline"
          onPress={() => void signOut('user')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ stack: { gap: spacing['4'] }, card: { gap: spacing['1'] } });
