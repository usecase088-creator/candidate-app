// The Notifications group in Settings (D32): one "Push notifications" row with a switch, a footer that says where
// things stand, and the way to turn push on. Nothing shows on a phone that cannot do push (emulator), so the screen
// never offers something that cannot work.
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Switch, View } from 'react-native';

import { ListGroup } from '@/components/ui/ListGroup';
import { ListRow } from '@/components/ui/ListRow';
import { AppText } from '@/components/ui/Text';
import { TextButton } from '@/components/ui/TextButton';
import { openAppSettings } from '@/features/uploads/pickers';
import { colors, spacing } from '@/theme/tokens';

import { enablePush, type PushPermission, pushPermission } from './pushService';

/** The switch only shows the state; the row handles the tap, so one target does the work. */
function PushSwitch({ on, busy }: { on: boolean; busy: boolean }) {
  if (busy) return <ActivityIndicator testID="settings.push.busy" color={colors.brand} />;
  return (
    <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants">
      <Switch
        testID="settings.push.switch"
        value={on}
        trackColor={{ false: colors.border, true: colors.brand }}
        thumbColor={colors.surface}
        ios_backgroundColor={colors.border}
      />
    </View>
  );
}

export function PushSettings() {
  const [permission, setPermission] = useState<PushPermission>();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const refresh = useCallback(() => {
    void pushPermission().then(setPermission);
  }, []);
  useEffect(refresh, [refresh]);

  async function turnOn() {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    const result = await enablePush();
    setBusy(false);
    if (!result.ok && result.reason === 'failed') setFailed(true);
    refresh();
  }

  if (!permission || permission === 'unavailable') return null;
  return (
    <View>
      <ListGroup testID="settings.group.notifications" header="Notifications">
        {permission === 'granted' ? (
          <ListRow
            testID="settings.push.on"
            title="Push notifications"
            accessibilityLabel="Push notifications, on"
            trailing={<PushSwitch on busy={false} />}
          />
        ) : permission === 'undetermined' ? (
          <ListRow
            testID="settings.push"
            title="Push notifications"
            accessibilityLabel="Turn on notifications"
            trailing={<PushSwitch on={false} busy={busy} />}
            haptic="light"
            onPress={() => void turnOn()}
          />
        ) : (
          <ListRow
            testID="settings.push.off"
            title="Push notifications"
            accessibilityLabel="Push notifications, off"
            trailing={<PushSwitch on={false} busy={false} />}
          />
        )}
      </ListGroup>
      <View style={styles.footer}>
        {permission === 'granted' ? (
          <AppText testID="settings.push.status" variant="secondary" color="mutedForeground">
            Notifications are on
          </AppText>
        ) : null}
        {permission === 'undetermined' ? (
          <AppText variant="secondary" color="mutedForeground">
            Get told when a recruiter responds to your application.
          </AppText>
        ) : null}
        {permission === 'denied' ? (
          <>
            <AppText testID="settings.push.status" variant="secondary" color="mutedForeground">
              Notifications are turned off for ApronHanger on this phone.
            </AppText>
            <TextButton
              testID="settings.push.open"
              label="Open phone settings"
              onPress={() => void openAppSettings()}
            />
          </>
        ) : null}
        {failed ? (
          <AppText
            testID="settings.push.error"
            variant="secondary"
            color="errorText"
            accessibilityLiveRegion="polite"
          >
            Could not turn on notifications. Please try again later.
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { paddingHorizontal: spacing['4'], paddingTop: spacing['2'], gap: spacing['1'] },
});
