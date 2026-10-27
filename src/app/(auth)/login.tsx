// Sign in — website auth.tsx (mode "signin"), docs/reference/SCREENS.md §1.
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Controller, type FieldErrors, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { FormErrorBox } from '@/components/ui/FormErrorBox';
import { LottieAnimation } from '@/components/ui/LottieAnimation';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/Text';
import { TextButton } from '@/components/ui/TextButton';
import { TextInput, type TextInputRef } from '@/components/ui/TextInput';
import { useToast } from '@/components/ui/Toast';
import { authApi } from '@/features/auth/authApi';
import { AuthModeTabs } from '@/features/auth/components/AuthModeTabs';
import { loginErrorMessage, ROLE_MISMATCH_MESSAGE, signOutNotice } from '@/features/auth/messages';
import { useSession } from '@/features/auth/sessionStore';
import { firstError, loginSchema, type LoginValues } from '@/features/auth/validation';
import { colors, radius, spacing } from '@/theme/tokens';

/** Website: success animation, then go in after 1.2 s (D19). */
const SUCCESS_DELAY_MS = 1200;
const FIELD_ORDER = ['email', 'password'] as const;

export default function Login() {
  const toast = useToast();
  const signIn = useSession((s) => s.signIn);
  const reason = useSession((s) => s.signOutReason);
  const reasonMessage = useSession((s) => s.signOutMessage);
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const passwordRef = useRef<TextInputRef>(null);
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
  };

  const onValid = async (values: LoginValues) => {
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
      <View style={styles.stack}>
        <AuthModeTabs active="signin" />
        <View style={styles.heading}>
          <AppText variant="title">Welcome back</AppText>
          <AppText color="mutedForeground">Sign in to access your saved jobs and applications.</AppText>
        </View>

        <FormErrorBox testID="login.notice" message={formError ? undefined : notice} />
        <FormErrorBox testID="login.error" message={formError} />

        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <TextInput
              testID="login.email"
              label="Email *"
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

        <View>
          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <PasswordInput
                ref={passwordRef}
                testID="login.password"
                label="Password *"
                accessibilityLabel="Password"
                placeholder="••••••••"
                returnKeyType="done"
                onSubmitEditing={() => void submit()}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={formState.errors.password?.message}
                editable={!working}
              />
            )}
          />
          <TextButton
            testID="login.forgot"
            label="Forgot password?"
            onPress={() => router.push('/forgot-password')}
          />
        </View>

        <Button
          testID="login.submit"
          label={working ? 'Please wait…' : 'Sign in'}
          loading={busy}
          disabled={working}
          onPress={() => void submit()}
        />
        {success && <LottieAnimation testID="login.success" name="authSuccess" size={64} />}

        <View style={styles.card}>
          <AppText variant="heading">New to ApronHanger?</AppText>
          <AppText color="mutedForeground">
            Build your verified candidate profile and unlock one-click applications to top hospitals.
          </AppText>
          <Button
            testID="login.signup"
            label="Create an account"
            variant="outline"
            onPress={() => router.replace('/signup')}
          />
          <AppText variant="caption" color="mutedForeground" align="center">
            100% Free • Verified Hospitals • Fast Response
          </AppText>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing['4'] },
  heading: { gap: spacing['2'] },
  card: {
    gap: spacing['3'],
    padding: spacing['4'],
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
});
