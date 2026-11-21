// Forgot password — website auth_.forgot-password.tsx, docs/reference/SCREENS.md §2.
// Steps phone → otp → reset → success. Errors and successes are toasts only, like the website.
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { isApiError } from '@/api/errors';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { LottieAnimation } from '@/components/ui/LottieAnimation';
import { OtpInput } from '@/components/ui/OtpInput';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/Text';
import { TextInput } from '@/components/ui/TextInput';
import { useToast } from '@/components/ui/Toast';
import { authApi } from '@/features/auth/authApi';
import { FORGOT_NETWORK_ERROR } from '@/features/auth/messages';
import { otpError, resetPasswordError, resetPhoneError } from '@/features/auth/validation';
import { colors, radius, spacing } from '@/theme/tokens';

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
  // A request is on its way. The OTP submits on its own at the 6th digit, so a press on the button that lands before
  // it re-renders as busy must not send a second request.
  const pending = useRef(false);

  useEffect(() => () => clearTimeout(timer.current), []);

  const error = (message: string) => toast.show(message, { variant: 'error' });
  const startOver = () => {
    setOtp('');
    setPassword('');
    setStep('phone');
  };

  const run = async (task: () => Promise<void>) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      await task();
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  const signInNow = () => {
    clearTimeout(timer.current);
    router.replace('/login');
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

  const verifyOtp = (code = otp) => {
    if (pending.current) return;
    const invalid = otpError(code);
    if (invalid) return error(invalid);
    return run(async () => {
      try {
        setReset(await authApi.verifyResetOtp(mobile, code));
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

  const back = BACK[step];

  return (
    <Screen testID="forgot.screen" scroll>
      <View style={styles.page}>
        {back ? (
          <BackLink
            testID={back.testID}
            label={back.label}
            disabled={busy && step !== 'phone'}
            onPress={step === 'phone' ? () => router.replace('/login') : startOver}
          />
        ) : null}

        {/* Fixed slot: the title sits at the same height on every step. */}
        <View testID="forgot.hero" style={styles.hero}>
          {step === 'phone' && <HeroIcon testID="forgot.hero.phone" name={PHONE} />}
          {step === 'otp' && <LottieAnimation testID="forgot.mailSent" name="mailSent" size={HERO} />}
          {step === 'reset' && <HeroIcon testID="forgot.hero.key" name={KEY} />}
          {step === 'success' && <LottieAnimation testID="forgot.done" name="resetDone" size={HERO} />}
        </View>

        {step === 'phone' && (
          <>
            <Heading
              title="Reset Password"
              subtitle="Enter your registered mobile number to receive an OTP."
            />
            <View style={styles.fields}>
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
              <Button
                testID="forgot.submit"
                label="Send OTP"
                haptic="medium"
                loading={busy}
                onPress={() => void sendOtp()}
              />
            </View>
          </>
        )}

        {step === 'otp' && (
          <>
            <Heading title="Verify & Reset" subtitle={`Enter the OTP sent to ${mobile}.`} />
            <View style={styles.fields}>
              <OtpInput
                testID="forgot.otp"
                label="OTP"
                value={otp}
                onChangeText={setOtp}
                onComplete={(code) => void verifyOtp(code)}
                autoFocus
              />
              <Button
                testID="forgot.submit"
                label="Verify OTP"
                haptic="medium"
                loading={busy}
                onPress={() => void verifyOtp()}
              />
            </View>
          </>
        )}

        {step === 'reset' && (
          <>
            <Heading title="Verify & Reset" subtitle={`Set a new password for ${reset?.maskedEmail ?? ''}`} />
            <View style={styles.fields}>
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
                haptic="medium"
                loading={busy}
                onPress={() => void resetPassword()}
              />
            </View>
          </>
        )}

        {step === 'success' && (
          <>
            <Heading title="Success!" subtitle="Your password has been reset successfully." centred />
            <Button testID="forgot.signin" label="Sign in" haptic="medium" onPress={signInNow} />
          </>
        )}
      </View>
    </Screen>
  );
}

/** Lottie size, and the height of the hero slot on every step. */
const HERO = 112;
const TILE = 64;
const TILE_ICON = 28;
const BACK_ICON = 20;
const BACK_HEIGHT = 44;

const PHONE = { ios: 'iphone', android: 'smartphone', web: 'smartphone' } as const;
const KEY = { ios: 'key.fill', android: 'key', web: 'key' } as const;
const CHEVRON = { ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' } as const;

/** The top-left way back on each step; its words are the website's link text (without the arrow glyph). */
const BACK: Record<Step, { testID: string; label: string } | undefined> = {
  phone: { testID: 'forgot.back', label: 'Back to Sign In' },
  otp: { testID: 'forgot.change', label: 'Change Mobile Number' },
  reset: { testID: 'forgot.restart', label: 'Start Over' },
  success: undefined,
};

function BackLink({
  testID,
  label,
  disabled,
  onPress,
}: {
  testID: string;
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      testID={testID}
      accessibilityLabel={label}
      pressScale={1}
      disabled={disabled}
      onPress={onPress}
      style={[styles.back, disabled && styles.disabled]}
    >
      <Icon testID={`${testID}.icon`} name={CHEVRON} size={BACK_ICON} tintColor={colors.brand} />
      <AppText variant="label" color="brand">
        {label}
      </AppText>
    </PressableScale>
  );
}

function HeroIcon({ testID, name }: { testID: string; name: typeof PHONE | typeof KEY }) {
  return (
    <View testID={testID} style={styles.tile}>
      <Icon testID={`${testID}.icon`} name={name} size={TILE_ICON} tintColor={colors.brand} />
    </View>
  );
}

function Heading({ title, subtitle, centred }: { title: string; subtitle: string; centred?: boolean }) {
  const align = centred ? 'center' : undefined;
  return (
    <View style={styles.group}>
      <AppText variant="display" align={align}>
        {title}
      </AppText>
      <AppText color="mutedForeground" align={align}>
        {subtitle}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  // D32 rhythm: sections 24 apart, items inside a group 8, fields 16.
  page: { gap: spacing['6'] },
  group: { gap: spacing['2'] },
  fields: { gap: spacing['4'] },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing['1'],
    minHeight: BACK_HEIGHT,
    // The chevron lines up with the form's left edge.
    marginLeft: -spacing['1'],
    paddingRight: spacing['2'],
  },
  disabled: { opacity: 0.5 },
  hero: { height: HERO, alignItems: 'center', justifyContent: 'center' },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: radius.full,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
