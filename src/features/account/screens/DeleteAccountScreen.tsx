// Delete my account (Google Play and the App Store both require it inside the app). Password, one more question, then
// the phone is signed out and forgets everything. What the server keeps and removes: backend PR 9.
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { FormErrorBox } from '@/components/ui/FormErrorBox';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/Text';
import { failureText } from '@/features/applications/messages';
import { useSession } from '@/features/auth/sessionStore';
import { confirmAction } from '@/lib/confirm';
import { spacing } from '@/theme/tokens';

import { accountApi } from '../accountApi';

export function DeleteAccountScreen() {
  const router = useRouter();
  const signOut = useSession((s) => s.signOut);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/settings'));

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
      <View style={styles.stack}>
        <Button
          testID="delete.back"
          label="← Back"
          accessibilityLabel="Back"
          variant="ghost"
          fullWidth={false}
          onPress={goBack}
        />
        <AppText variant="title" accessibilityRole="header">
          Delete account
        </AppText>
        <View testID="delete.warning" style={styles.stack}>
          <AppText>This permanently deletes your ApronHanger account. It cannot be undone.</AppText>
          <AppText color="mutedForeground">
            Your profile, CV, photo, documents, saved jobs and notifications are removed. Your name and files
            are taken off your past applications, but the applications themselves stay with the hospitals you
            applied to as their records: status and dates, the hospital&apos;s own notes, the interview
            history and any offer letter they issued.
          </AppText>
        </View>
        <PasswordInput
          testID="delete.password"
          label="Password"
          value={password}
          onChangeText={setPassword}
          editable={!busy}
          returnKeyType="done"
          onSubmitEditing={() => void submit()}
        />
        <FormErrorBox testID="delete.error" message={error} />
        <Button
          testID="delete.submit"
          label="Delete my account"
          variant="destructive"
          loading={busy}
          onPress={() => void submit()}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ stack: { gap: spacing['3'] } });
