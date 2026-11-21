import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { StyleSheet } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { ListGroup } from '@/components/ui/ListGroup';
import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/Text';
import { PushSettings } from '@/features/push/PushSettings';
import { useSession } from '@/features/auth/sessionStore';
import { PRIVACY_URL, TERMS_URL } from '@/lib/site';
import { colors, spacing } from '@/theme/tokens';

const ICONS = {
  privacy: { ios: 'lock.shield', android: 'shield', web: 'shield' },
  terms: { ios: 'doc.text', android: 'description', web: 'description' },
  external: { ios: 'arrow.up.right', android: 'open_in_new', web: 'open_in_new' },
  signOut: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' },
  delete: { ios: 'trash', android: 'delete', web: 'delete' },
} as const;
const ICON_SIZE = 24;
const ROW_INSET = spacing['4'] + ICON_SIZE + spacing['3'];

const external = (testID: string) => (
  <Icon testID={`${testID}.external`} name={ICONS.external} size={18} tintColor={colors.mutedForeground} />
);

/** D32 R2 (issue 19): every leading icon in brand blue; only the destructive row is red. */
const lead = (testID: string, name: (typeof ICONS)[keyof typeof ICONS], tint: string = colors.brand) => (
  <Icon testID={`${testID}.icon`} name={name} size={ICON_SIZE} tintColor={tint} />
);

/**
 * Settings (D32): grouped lists. Notifications (push), About (Privacy Policy, Terms and Conditions open in the
 * in-app browser) and Account (Sign out, then Delete account as the last, red-text row with its note as the footer).
 */
export function SettingsScreen() {
  const router = useRouter();
  const signOut = useSession((s) => s.signOut);
  return (
    <Screen testID="settings.screen" scroll padded={false}>
      <PushSettings />
      <ListGroup testID="settings.group.about" header="About" separatorInset={ROW_INSET}>
        <ListRow
          testID="settings.privacy"
          title="Privacy Policy"
          leading={lead('settings.privacy', ICONS.privacy)}
          trailing={external('settings.privacy')}
          onPress={() => void WebBrowser.openBrowserAsync(PRIVACY_URL)}
        />
        <ListRow
          testID="settings.terms"
          title="Terms and Conditions"
          leading={lead('settings.terms', ICONS.terms)}
          trailing={external('settings.terms')}
          onPress={() => void WebBrowser.openBrowserAsync(TERMS_URL)}
        />
      </ListGroup>
      <ListGroup
        testID="settings.group.account"
        header="Account"
        separatorInset={ROW_INSET}
        footer="Deletes your profile, CV, photo, documents and saved jobs. Your applications stay with the hospitals."
      >
        <ListRow
          testID="settings.signout"
          title="Sign out"
          leading={lead('settings.signout', ICONS.signOut)}
          trailing="none"
          onPress={() => void signOut('user')}
        />
        <ListRow
          testID="settings.delete"
          title="Delete account"
          destructive
          leading={lead('settings.delete', ICONS.delete, colors.errorText)}
          trailing="none"
          onPress={() => router.push('/delete-account')}
        />
      </ListGroup>
      <AppText
        testID="settings.version"
        variant="caption"
        color="mutedForeground"
        align="center"
        style={styles.version}
      >
        {`Version ${Constants.expoConfig?.version ?? ''}`}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  version: { marginTop: spacing['8'], marginBottom: spacing['6'] },
});
