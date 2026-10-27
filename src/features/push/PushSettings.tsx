// The notifications row in Settings: say whether push is on, and let the user turn it on. Nothing shows on a phone that
// cannot do push (emulator), so the screen never offers something that cannot work.
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { AppText } from '@/components/ui/Text';
import { openAppSettings } from '@/features/uploads/pickers';
import { spacing } from '@/theme/tokens';

import { enablePush, type PushPermission, pushPermission } from './pushService';

export function PushSettings() {
  const [permission, setPermission] = useState<PushPermission>();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const refresh = useCallback(() => {
    void pushPermission().then(setPermission);
  }, []);
  useEffect(refresh, [refresh]);

  async function turnOn() {
    setBusy(true);
    setFailed(false);
    const result = await enablePush();
    setBusy(false);
    if (!result.ok && result.reason === 'failed') setFailed(true);
    refresh();
  }

  if (!permission || permission === 'unavailable') return null;
  return (
    <View style={styles.stack}>
      <AppText variant="label">Notifications</AppText>
      {permission === 'granted' ? (
        <AppText testID="settings.push.status" color="mutedForeground">
          Notifications are on
        </AppText>
      ) : null}
      {permission === 'undetermined' ? (
        <>
          <AppText color="mutedForeground">Get told when a recruiter responds to your application.</AppText>
          <Button
            testID="settings.push"
            label="Turn on notifications"
            variant="outline"
            loading={busy}
            onPress={() => void turnOn()}
          />
        </>
      ) : null}
      {permission === 'denied' ? (
        <>
          <AppText testID="settings.push.status" color="mutedForeground">
            Notifications are turned off for ApronHanger on this phone.
          </AppText>
          <Button
            testID="settings.push.open"
            label="Open phone settings"
            variant="outline"
            onPress={() => void openAppSettings()}
          />
        </>
      ) : null}
      {failed ? (
        <AppText testID="settings.push.error" color="errorText" accessibilityLiveRegion="polite">
          Could not turn on notifications. Please try again later.
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({ stack: { gap: spacing['2'] } });
