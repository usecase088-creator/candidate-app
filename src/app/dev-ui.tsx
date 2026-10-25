// Development-only UI catalog: every base component on one screen, for checks on the phone (font scale 2)
// and in Playwright (320 px). Preview and production builds redirect to the home screen.
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { OtpInput } from '@/components/ui/OtpInput';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { AppText } from '@/components/ui/Text';
import { TextInput } from '@/components/ui/TextInput';
import { useToast } from '@/components/ui/Toast';
import { type Env, getEnv } from '@/lib/env';
import { spacing } from '@/theme/tokens';

export function isDevToolsEnabled(env: Pick<Env, 'appVariant'>): boolean {
  return env.appVariant === 'development';
}

export default function DevUi() {
  const toast = useToast();
  const [otp, setOtp] = useState('12');
  if (!isDevToolsEnabled(getEnv())) return <Redirect href="/" />;

  return (
    <Screen testID="dev.ui" scroll>
      <View style={styles.stack}>
        <AppText variant="title">Welcome back</AppText>
        <AppText color="mutedForeground">Sign in to continue your healthcare career journey.</AppText>

        <TextInput
          testID="dev.ui.email"
          label="Email address"
          placeholder="you@hospital.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          testID="dev.ui.email.error"
          label="Email address"
          defaultValue="asha@"
          error="Please enter a valid email address."
        />
        <PasswordInput
          testID="dev.ui.password"
          label="Password"
          helper="At least 8 characters, with upper and lower case and a symbol."
        />
        <OtpInput testID="dev.ui.otp" label="Mobile OTP" value={otp} onChangeText={setOtp} />

        <Button testID="dev.ui.button.primary" label="Sign In" onPress={() => toast.show('Signed in')} />
        <Button
          testID="dev.ui.button.gradient"
          label="Create Account"
          variant="gradient"
          onPress={() => {}}
        />
        <Button testID="dev.ui.button.loading" label="Send OTP" variant="brand" loading onPress={() => {}} />
        <Button
          testID="dev.ui.button.outline"
          label="Edit signup details"
          variant="outline"
          onPress={() => {}}
        />
        <Button testID="dev.ui.button.disabled" label="Disabled" disabled onPress={() => {}} />
        <Button
          testID="dev.ui.toast"
          label="Show error toast"
          variant="destructive"
          onPress={() => toast.show('Invalid OTP.', { variant: 'error' })}
        />

        <View style={styles.skeletons}>
          <Skeleton width="70%" height={16} />
          <Skeleton width="45%" height={12} />
        </View>

        <ErrorState
          testID="dev.ui.error"
          message="Network error. Please check your connection and try again."
          onRetry={() => {}}
        />
        <EmptyState
          testID="dev.ui.empty"
          title="No saved jobs yet"
          message="Save jobs to find them here."
          action={{ label: 'Browse jobs', onPress: () => {} }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing['4'] },
  skeletons: { gap: spacing['2'] },
});
