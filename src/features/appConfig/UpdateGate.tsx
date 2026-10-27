import type { ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/Text';
import { IOS_STORE_URL, PLAY_STORE_URL } from '@/lib/site';
import { spacing } from '@/theme/tokens';

import { useUpdateRequired } from './useAppConfig';

/** Wraps the whole app: when the server asks for a newer version, the only thing on screen is the update page. */
export function UpdateGate({ children }: { children: ReactNode }) {
  const required = useUpdateRequired();
  return required ? <UpdateScreen /> : <>{children}</>;
}

function UpdateScreen() {
  const url = Platform.OS === 'ios' ? IOS_STORE_URL : PLAY_STORE_URL;
  return (
    <Screen testID="update.screen" scroll>
      <View style={styles.stack}>
        <AppText variant="title" accessibilityRole="header">
          Update required
        </AppText>
        <AppText color="mutedForeground">
          This version of ApronHanger is no longer supported. Please update the app to continue.
        </AppText>
        <Button
          testID="update.open"
          label="Update"
          accessibilityLabel="Open the store to update ApronHanger"
          onPress={() => void WebBrowser.openBrowserAsync(url)}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ stack: { gap: spacing['4'], paddingTop: spacing['8'] } });
