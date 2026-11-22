// Sign in — website auth.tsx (mode "signin"), docs/reference/SCREENS.md §1.
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Controller, type FieldErrors, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { LottieAnimation } from '@/components/ui/LottieAnimation';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/Text';
import { TextButton } from '@/components/ui/TextButton';
import { TextInput, type TextInputRef } from '@/components/ui/TextInput';
import { useToast } from '@/components/ui/Toast';
import { authApi } from '@/features/auth/authApi';
import { AuthModeTabs } from '@/features/auth/components/AuthModeTabs';
import { FormMessage } from '@/features/auth/components/FormMessage';
import { TrustLine } from '@/features/auth/components/TrustLine';
import { loginErrorMessage, ROLE_MISMATCH_MESSAGE, signOutNotice } from '@/features/auth/messages';
import { useSession } from '@/features/auth/sessionStore';
import { hasSignInTarget, takeSignInTarget } from '@/features/auth/signInGate';
import { firstError, loginSchema, type LoginValues } from '@/features/auth/validation';
import { spacing } from '@/theme/tokens';

/** Website: success animation, then go in after 1.2 s (D19). */
const SUCCESS_DELAY_MS = 1200;
const FIELD_ORDER = ['email', 'password'] as const;

export default function Login() {
  const toast = useToast();
  const signIn = useSession((s) => s.signIn);
  const reason = useSession((s) => s.signOutReason);
  const reasonMessage = useSession((s) => s.signOutMessage);
  // Website: a gated action (redirect set) changes the subtitle. Read once: the target only changes before this opens.
  const [gated] = useState(hasSignInTarget);
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const passwordRef = useRef<TextInputRef>(null);
  // R3 #15: a second tap can land before the re-render that disables Sign in: one login request at a time.
  const pending = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const { control, handleSubmit, formState } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const fail = (message: string) => {
    setFormError(message);
    toast.show(message, { variant: 'error' });
    setBusy(false);
    pending.current = false;
  };

  const onValid = async (values: LoginValues) => {
    if (pending.current) return;
    pending.current = true;
    setFormError(undefined);
    setBusy(true);
    try {
      const { token, user, refreshToken } = await authApi.login(values);
      if (user.role !== 'CANDIDATE') return fail(ROLE_MISMATCH_MESSAGE);
      toast.show('Welcome back!', { variant: 'success' });
      setSuccess(true);
      timer.current = setTimeout(() => {
        // Signing in switches the (auth) layout to Home.
        signIn(token, user, refreshToken).catch(() => {
          setSuccess(false);
          fail(loginErrorMessage(undefined));
        });
      }, SUCCESS_DELAY_MS);
    } catch (e) {
      fail(loginErrorMessage(e));
    }
  };

  const onInvalid = (errors: FieldErrors<LoginValues>) => setFormError(firstError(errors, FIELD_ORDER));
  // Called from handlers only: handleSubmit reads refs, which must not happen during render.
  const submit = () => handleSubmit(onValid, onInvalid)();
  const notice = signOutNotice(reason, reasonMessage);
  const working = busy || success;

  return (
    <Screen testID="login.screen" scroll>
      <View style={styles.page}>
        <AuthModeTabs active="signin" />
        <View style={styles.group}>
          <AppText variant="display">Welcome back</AppText>
          <AppText color="mutedForeground">
            {gated
              ? 'Sign in to continue your application.'
              : 'Sign in to access your saved jobs and applications.'}
          </AppText>
        </View>

        {formError ? (
          <FormMessage testID="login.error" tone="error" message={formError} />
        ) : (
          <FormMessage
            testID="login.notice"
            tone={reason === 'blocked' ? 'error' : 'info'}
            message={notice}
          />
        )}

        <View style={styles.fields}>
          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <TextInput
                testID="login.email"
                label="Email"
                required
                accessibilityLabel="Email"
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="username"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => passwordRef.current?.focus()}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={formState.errors.email?.message}
                editable={!working}
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <PasswordInput
                ref={passwordRef}
                testID="login.password"
                label="Password"
                required
                accessibilityLabel="Password"
                placeholder="••••••••"
                returnKeyType="done"
                onSubmitEditing={() => void submit()}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={formState.errors.password?.message}
                editable={!working}
                labelAccessory={
                  // Website: the link sits on the label row. The negative margin keeps the row at the label's height;
                  // the link's hit slop still gives it a 44-pt target.
                  <View style={styles.labelLink}>
                    <TextButton
                      testID="login.forgot"
                      label="Forgot password?"
                      onPress={() => router.push('/forgot-password')}
                    />
                  </View>
                }
              />
            )}
          />
        </View>

        <View style={styles.fields}>
          <Button
            testID="login.submit"
            label={working ? 'Please wait…' : 'Sign in'}
            haptic="medium"
            loading={busy}
            disabled={working}
            onPress={() => void submit()}
          />
          {success && <LottieAnimation testID="login.success" name="authSuccess" size={64} />}
          <View style={styles.centre}>
            <TextButton
              testID="login.browse"
              label="Browse jobs without signing in"
              onPress={() => {
                // Ends the "you were signed out" state, so the tabs stop sending this visitor back here.
                useSession.setState({ signOutReason: undefined, signOutMessage: undefined });
                takeSignInTarget();
                // Tabs already under the login screen: go back to them instead of stacking a second set.
                if (router.canDismiss()) router.dismissTo('/');
                else router.replace('/');
              }}
            />
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.footerLine}>
            <AppText color="mutedForeground" align="center">
              New to ApronHanger?
            </AppText>
            <TextButton
              testID="login.signup"
              label="Create an account"
              onPress={() => router.replace('/signup')}
            />
          </View>
          {/* Website wording kept (login page card). */}
          <AppText variant="secondary" color="mutedForeground" align="center">
            Build your verified candidate profile and unlock one-click applications to top hospitals.
          </AppText>
          <AppText variant="caption" color="mutedForeground" align="center">
            100% Free • Verified Hospitals • Fast Response
          </AppText>
          <TrustLine testID="login.trust" />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // D32 rhythm: sections 24 apart, items inside a group 8, fields 16.
  page: { flexGrow: 1, gap: spacing['6'] },
  group: { gap: spacing['2'] },
  fields: { gap: spacing['4'] },
  labelLink: { marginVertical: -spacing['2'] },
  centre: { alignItems: 'center' },
  // Pushed to the bottom of a tall screen; on a short one it follows the form.
  footer: { marginTop: 'auto', gap: spacing['2'], alignItems: 'center' },
  footerLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: spacing['1'],
  },
});
