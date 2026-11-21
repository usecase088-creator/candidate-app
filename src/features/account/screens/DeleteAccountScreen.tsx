// Delete my account (Google Play and the App Store both require it inside the app). Password, one more question, then
// the phone is signed out and forgets everything. What the server keeps and removes: backend PR 9.
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Panel } from '@/components/ui/Panel';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/Text';
import { failureText } from '@/features/applications/messages';
import { FormMessage } from '@/features/auth/components/FormMessage';
import { useSession } from '@/features/auth/sessionStore';
import { confirmAction } from '@/lib/confirm';
import { colors, spacing } from '@/theme/tokens';

import { accountApi } from '../accountApi';

export function DeleteAccountScreen() {
  const signOut = useSession((s) => s.signOut);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    if (!password) return setError('Enter your password to delete your account.');
    setError(undefined);
    const sure = await confirmAction({
      title: 'Delete your account?',
      message: 'This cannot be undone.',
      confirmLabel: 'Delete',
    });
    if (!sure) return;
    setBusy(true);
    try {
      await accountApi.deleteAccount(password);
    } catch (e) {
      setBusy(false);
      return setError(failureText(e, 'Failed to delete account', { reasonOnly: true }));
    }
    // The account is gone: the phone forgets it too. No call to the server is left to make.
    await signOut('deleted');
  }

  return (
    <Screen testID="delete.screen" scroll>
      <View style={styles.page}>
        <View testID="delete.warning" style={styles.section}>
          <Panel
            testID="delete.warning.panel"
            tone="error"
            icon={WARNING}
            title="This permanently deletes your ApronHanger account."
          >
            <AppText>It cannot be undone.</AppText>
          </Panel>
          <BulletGroup testID="delete.removed" title="What is removed" icon={REMOVED} items={REMOVED_ITEMS} />
          <BulletGroup
            testID="delete.kept"
            title="What the hospitals you applied to keep as their records"
            icon={KEPT}
            items={KEPT_ITEMS}
          />
        </View>

        <View style={styles.section}>
          <PasswordInput
            testID="delete.password"
            label="Password"
            value={password}
            onChangeText={setPassword}
            editable={!busy}
            returnKeyType="done"
            onSubmitEditing={() => void submit()}
          />
          <FormMessage testID="delete.error" tone="error" message={error} />
          <Button
            testID="delete.submit"
            label="Delete my account"
            variant="destructive"
            size="lg"
            haptic="warning"
            loading={busy}
            onPress={() => void submit()}
          />
        </View>
      </View>
    </Screen>
  );
}

// What the server removes and keeps: backend PR 9, docs/store/ACCOUNT-DELETION-DATA.md (Apple asks apps to say what is
// retained).
const REMOVED_ITEMS = [
  'Your profile, CV and photo',
  'Your documents, saved jobs and notifications',
  'Your name and files on your past applications',
];
const KEPT_ITEMS = [
  'Your applications, with their status and dates',
  "The hospital's own notes",
  'The interview history',
  'Any offer letter they issued',
];

const WARNING = { ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' } as const;
const REMOVED = { ios: 'trash', android: 'delete', web: 'delete' } as const;
const KEPT = { ios: 'building.2', android: 'apartment', web: 'apartment' } as const;
const BULLET_ICON = 18;

function BulletGroup({
  testID,
  title,
  icon,
  items,
}: {
  testID: string;
  title: string;
  icon: typeof REMOVED | typeof KEPT;
  items: string[];
}) {
  return (
    <View testID={testID} style={styles.group}>
      <AppText variant="label" weight="semibold">
        {title}
      </AppText>
      {items.map((item, i) => (
        <View key={item} testID={`${testID}.${i}`} style={styles.bullet}>
          <Icon
            testID={`${testID}.${i}.icon`}
            name={icon}
            size={BULLET_ICON}
            tintColor={colors.mutedForeground}
            style={styles.bulletIcon}
          />
          <AppText color="mutedForeground" style={styles.flex}>
            {item}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // D32 rhythm: sections 24 apart, items inside a group 8, fields 16.
  page: { gap: spacing['6'] },
  section: { gap: spacing['4'] },
  group: { gap: spacing['2'] },
  bullet: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing['3'] },
  // Centres the 18-pt icon on the 20-pt first line.
  bulletIcon: { marginTop: 1 },
  flex: { flex: 1 },
});
