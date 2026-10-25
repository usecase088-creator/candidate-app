// Forgot password — website auth_.forgot-password.tsx, docs/reference/SCREENS.md §2.
// Steps phone → otp → reset → success. Errors and successes are toasts only, like the website.
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { isApiError } from '@/api/errors';
import { Button } from '@/components/ui/Button';
import { LottieAnimation } from '@/components/ui/LottieAnimation';
import { OtpInput } from '@/components/ui/OtpInput';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/Text';
import { TextButton } from '@/components/ui/TextButton';
import { TextInput } from '@/components/ui/TextInput';
import { useToast } from '@/components/ui/Toast';
import { authApi } from '@/features/auth/authApi';
import { FORGOT_NETWORK_ERROR } from '@/features/auth/messages';
import { otpError, resetPasswordError, resetPhoneError } from '@/features/auth/validation';
import { spacing } from '@/theme/tokens';

type Step = 'phone' | 'otp' | 'reset' | 'success';
const BACK_TO_LOGIN_MS = 2500;

/** Website: the server's `error`, else the step's fallback; network failures have their own message. */
function errorText(e: unknown, fallback: string): string {
  if (isApiError(e) && e.kind === 'http') return e.serverMessage ?? fallback;
  if (isApiError(e) && (e.kind === 'network' || e.kind === 'timeout')) return FORGOT_NETWORK_ERROR;
  return fallback;
}

export default function ForgotPassword() {
  const toast = useToast();
  const [step, setStep] = useState<Step>('phone');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [reset, setReset] = useState<{ resetToken: string; maskedEmail: string }>();
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const error = (message: string) => toast.show(message, { variant: 'error' });
  const startOver = () => {
    setOtp('');
    setPassword('');
    setStep('phone');
  };

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    try {
      await task();
    } finally {
      setBusy(false);
    }
  };

  const sendOtp = () => {
    const invalid = resetPhoneError(mobile);
    if (invalid) return error(invalid);
    return run(async () => {
      try {
        await authApi.forgotPassword(mobile);
        toast.show('OTP sent to your mobile number.', { variant: 'success' });
        setOtp('');
        setStep('otp');
      } catch (e) {
        error(errorText(e, 'Failed to send OTP. Please check your number.'));
      }
    });
  };

  const verifyOtp = () => {
    const invalid = otpError(otp);
    if (invalid) return error(invalid);
    return run(async () => {
      try {
        setReset(await authApi.verifyResetOtp(mobile, otp));
        setStep('reset');
      } catch (e) {
        error(errorText(e, 'Invalid OTP.'));
      }
    });
  };

  const resetPassword = () => {
    const invalid = resetPasswordError(password);
    if (invalid) return error(invalid);
    if (!reset) return startOver();
    return run(async () => {
      try {
        await authApi.resetPassword(reset.resetToken, password);
        toast.show('Password reset successfully! Please sign in with your new password.', {
          variant: 'success',
        });
        setStep('success');
        timer.current = setTimeout(() => router.replace('/login'), BACK_TO_LOGIN_MS);
      } catch (e) {
        error(errorText(e, 'Password reset failed. Please try again.'));
      }
    });
  };

  return (
    <Screen testID="forgot.screen" scroll>
      <View style={styles.stack}>
        {step === 'otp' && <LottieAnimation testID="forgot.mailSent" name="mailSent" size={110} />}
        {step === 'success' && <LottieAnimation testID="forgot.done" name="resetDone" size={110} />}

        {step === 'phone' && (
          <>
            <Heading
              title="Reset Password"
              subtitle="Enter your registered mobile number to receive an OTP."
            />
            <TextInput
              testID="forgot.mobile"
              label="Mobile Number"
              placeholder="Enter 10-digit number"
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              returnKeyType="done"
              onSubmitEditing={() => void sendOtp()}
              value={mobile}
              onChangeText={setMobile}
              editable={!busy}
            />
            <Button testID="forgot.submit" label="Send OTP" loading={busy} onPress={() => void sendOtp()} />
            <TextButton
              testID="forgot.back"
              label="← Back to Sign In"
              accessibilityLabel="Back to Sign In"
              onPress={() => router.replace('/login')}
            />
          </>
        )}

        {step === 'otp' && (
          <>
            <Heading title="Verify & Reset" subtitle={`Enter the OTP sent to ${mobile}.`} />
            <OtpInput testID="forgot.otp" label="OTP" value={otp} onChangeText={setOtp} autoFocus />
            <Button
              testID="forgot.submit"
              label="Verify OTP"
              loading={busy}
              onPress={() => void verifyOtp()}
            />
            <TextButton
              testID="forgot.change"
              label="← Change Mobile Number"
              accessibilityLabel="Change Mobile Number"
              onPress={startOver}
              disabled={busy}
            />
          </>
        )}

        {step === 'reset' && (
          <>
            <Heading title="Verify & Reset" subtitle={`Set a new password for ${reset?.maskedEmail ?? ''}`} />
            <PasswordInput
              testID="forgot.password"
              label="New Password"
              placeholder="Min. 8 chars, 1 upper, 1 lower, 1 special"
              isNew
              returnKeyType="done"
              onSubmitEditing={() => void resetPassword()}
              value={password}
              onChangeText={setPassword}
              editable={!busy}
            />
            <Button
              testID="forgot.submit"
              label="Reset Password"
              loading={busy}
              onPress={() => void resetPassword()}
            />
            <TextButton
              testID="forgot.restart"
              label="← Start Over"
              accessibilityLabel="Start Over"
              onPress={startOver}
              disabled={busy}
            />
          </>
        )}

        {step === 'success' && (
          <Heading title="Success!" subtitle="Your password has been reset successfully." />
        )}
      </View>
    </Screen>
  );
}

function Heading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.heading}>
      <AppText variant="title" align="center">
        {title}
      </AppText>
      <AppText color="mutedForeground" align="center">
        {subtitle}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing['4'] },
  heading: { gap: spacing['2'] },
});
