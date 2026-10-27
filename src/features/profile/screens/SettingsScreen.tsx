import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/Text';
import { useSession } from '@/features/auth/sessionStore';
import { PRIVACY_URL, TERMS_URL } from '@/lib/site';
import { spacing } from '@/theme/tokens';

export function SettingsScreen() {
  const router = useRouter();
  const signOut = useSession((s) => s.signOut);
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/profile'));
  return (
    <Screen testID="settings.screen" scroll>
      <View style={styles.stack}>
        <Button
          testID="settings.back"
          label="← Back"
          accessibilityLabel="Back"
          variant="ghost"
          fullWidth={false}
          onPress={goBack}
        />
        <AppText variant="title" accessibilityRole="header">
          Settings
        </AppText>
        <Button
          testID="settings.privacy"
          label="Privacy Policy"
          variant="outline"
          onPress={() => void WebBrowser.openBrowserAsync(PRIVACY_URL)}
        />
        <Button
          testID="settings.terms"
          label="Terms and Conditions"
          variant="outline"
          onPress={() => void WebBrowser.openBrowserAsync(TERMS_URL)}
        />
        <Button
          testID="settings.signout"
          label="Sign out"
          variant="outline"
          onPress={() => void signOut('user')}
        />
        <AppText testID="settings.version" color="mutedForeground" align="center">
          {`Version ${Constants.expoConfig?.version ?? ''}`}
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ stack: { gap: spacing['3'] } });
