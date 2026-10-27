// Create account — website auth.tsx (mode "signup"), docs/reference/SCREENS.md §1: details → OTP on one screen.
import { zodResolver } from '@hookform/resolvers/zod';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
import { Controller, type FieldErrors, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { isApiError } from '@/api/errors';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { FormErrorBox } from '@/components/ui/FormErrorBox';
import { LottieAnimation } from '@/components/ui/LottieAnimation';
import { OtpInput } from '@/components/ui/OtpInput';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/Text';
import { TextButton } from '@/components/ui/TextButton';
import { TextInput, type TextInputRef } from '@/components/ui/TextInput';
import { useToast } from '@/components/ui/Toast';
import { authApi } from '@/features/auth/authApi';
import { AuthModeTabs } from '@/features/auth/components/AuthModeTabs';
import { loginErrorMessage } from '@/features/auth/messages';
import { useSession } from '@/features/auth/sessionStore';
import { firstError, otpError, signupSchema, type SignupValues } from '@/features/auth/validation';
import { PRIVACY_URL, TERMS_URL } from '@/lib/site';
import { colors, radius, spacing } from '@/theme/tokens';

const SUCCESS_DELAY_MS = 1200;
/** The website's red box shows the first error in its schema order. */
const FIELD_ORDER = ['email', 'name', 'password', 'mobile'] as const;
const CONSENT_ERROR = 'Please accept the Terms & Conditions and Privacy Consent to continue.';
const REQUIREMENTS = [
  'At least 8 characters long',
  'At least one uppercase letter (A-Z)',
  'At least one lowercase letter (a-z)',
  'At least one special character (e.g. @, #, $, etc.)',
];

export default function Signup() {
  const toast = useToast();
  const signIn = useSession((s) => s.signIn);
  const [step, setStep] = useState<'details' | 'otp'>('details');
  const [draft, setDraft] = useState<SignupValues>();
  const [otp, setOtp] = useState('');
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  // Website: optional, never sent to the backend.
  const [alerts, setAlerts] = useState(false);
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const mobileRef = useRef<TextInputRef>(null);
  const emailRef = useRef<TextInputRef>(null);
  const passwordRef = useRef<TextInputRef>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const { control, handleSubmit, formState } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', mobile: '', email: '', password: '' },
  });

  const fail = (message: string) => {
    setFormError(message);
    toast.show(message, { variant: 'error' });
    setBusy(false);
  };

  const sendOtp = async (values: SignupValues) => {
    if (!terms || !privacy) return setFormError(CONSENT_ERROR);
    setFormError(undefined);
    setBusy(true);
    try {
      await authApi.sendSignupOtp(values.mobile);
      setDraft(values);
      setOtp('');
      setStep('otp');
      toast.show('OTP sent to your mobile number.', { variant: 'success' });
      setBusy(false);
    } catch (e) {
      fail(loginErrorMessage(e));
    }
  };

  const verifyAndRegister = async () => {
    if (!draft) return setStep('details');
    const invalid = otpError(otp);
    if (invalid) return setFormError(invalid);
    setFormError(undefined);
    setBusy(true);

    let signupToken: string;
    try {
      signupToken = await authApi.verifySignupOtp(draft.mobile, otp);
    } catch (e) {
      // Website: the server's message or "Invalid OTP."; network as for sign-in.
      if (isApiError(e) && e.kind === 'http') return fail(e.serverMessage ?? 'Invalid OTP.');
      return fail(loginErrorMessage(e));
    }

    try {
      const { token, user } = await authApi.register({ ...draft, signupToken });
      toast.show('Account created!', { variant: 'success' });
      setSuccess(true);
      timer.current = setTimeout(() => {
        signIn(token, user).catch(() => {
          setSuccess(false);
          fail(loginErrorMessage(undefined));
        });
      }, SUCCESS_DELAY_MS);
    } catch (e) {
      fail(loginErrorMessage(e));
    }
  };

  const onInvalid = (errors: FieldErrors<SignupValues>) => setFormError(firstError(errors, FIELD_ORDER));
  // Called from handlers only: handleSubmit reads refs, which must not happen during render.
  const submitDetails = () => handleSubmit(sendOtp, onInvalid)();
  const working = busy || success;
  const errors = formState.errors;

  return (
    <Screen testID="signup.screen" scroll>
      <View style={styles.stack}>
        <AuthModeTabs active="signup" />
        <View style={styles.heading}>
          <View style={styles.titleRow}>
            <AppText variant="title">Create your account</AppText>
            <View style={styles.badge}>
              <AppText variant="caption" weight="semibold" color="brand">
                Candidate
              </AppText>
            </View>
          </View>
          <AppText color="mutedForeground">
            Join 1.2L+ verified healthcare professionals across India.
          </AppText>
        </View>

        <FormErrorBox testID="signup.error" message={formError} />

        {step === 'details' ? (
          <>
            <Controller
              control={control}
              name="name"
              render={({ field }) => (
                <TextInput
                  testID="signup.name"
                  label="Full name *"
                  accessibilityLabel="Full name"
                  placeholder="Dr. Aarav Mehta"
                  autoComplete="name"
                  textContentType="name"
                  returnKeyType="next"
                  submitBehavior="submit"
                  onSubmitEditing={() => mobileRef.current?.focus()}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.name?.message}
                  editable={!working}
                />
              )}
            />
            <Controller
              control={control}
              name="mobile"
              render={({ field }) => (
                <TextInput
                  ref={mobileRef}
                  testID="signup.mobile"
                  label="Mobile Number *"
                  accessibilityLabel="Mobile number"
                  placeholder="+91 9876543210"
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  textContentType="telephoneNumber"
                  returnKeyType="next"
                  submitBehavior="submit"
                  onSubmitEditing={() => emailRef.current?.focus()}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.mobile?.message}
                  editable={!working}
                />
              )}
            />
            <Controller
              control={control}
              name="email"
              render={({ field }) => (
                <TextInput
                  ref={emailRef}
                  testID="signup.email"
                  label="Email *"
                  accessibilityLabel="Email"
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="emailAddress"
                  returnKeyType="next"
                  submitBehavior="submit"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.email?.message}
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
                  testID="signup.password"
                  label="Password *"
                  accessibilityLabel="Password"
                  placeholder="Min. 8 chars, 1 upper, 1 lower, 1 special"
                  isNew
                  returnKeyType="done"
                  onSubmitEditing={() => void submitDetails()}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.password?.message}
                  editable={!working}
                />
              )}
            />
            <View testID="signup.requirements" style={styles.requirements}>
              <AppText variant="caption" weight="semibold">
                Password Requirements:
              </AppText>
              {REQUIREMENTS.map((r) => (
                <View key={r} style={styles.requirement}>
                  <AppText variant="caption" color="mutedForeground" importantForAccessibility="no">
                    •
                  </AppText>
                  <AppText variant="caption" color="mutedForeground" style={styles.flex}>
                    {r}
                  </AppText>
                </View>
              ))}
            </View>

            <Button
              testID="signup.submit"
              label={busy ? 'Please wait…' : 'Send OTP'}
              variant="gradient"
              loading={busy}
              disabled={working}
              onPress={() => void submitDetails()}
            />

            <Checkbox
              testID="signup.terms"
              checked={terms}
              onChange={setTerms}
              invalid={formError === CONSENT_ERROR}
              accessibilityLabel="I have read and agree to the Terms & Conditions."
            >
              <AppText variant="caption">
                I have read and agree to the{' '}
                <AppText
                  testID="signup.terms.link"
                  variant="caption"
                  weight="semibold"
                  color="brand"
                  accessibilityRole="link"
                  onPress={() => void WebBrowser.openBrowserAsync(TERMS_URL)}
                >
                  Terms & Conditions
                </AppText>
                .
              </AppText>
            </Checkbox>
            <Checkbox
              testID="signup.privacy"
              checked={privacy}
              onChange={setPrivacy}
              invalid={formError === CONSENT_ERROR}
              accessibilityLabel="I consent to the collection, processing, storage and sharing of my personal and professional information for recruitment purposes as described in the Privacy Policy."
            >
              <AppText variant="caption">
                I consent to the collection, processing, storage and sharing of my personal and professional
                information for recruitment purposes as described in the{' '}
                <AppText
                  testID="signup.privacy.link"
                  variant="caption"
                  weight="semibold"
                  color="brand"
                  accessibilityRole="link"
                  onPress={() => void WebBrowser.openBrowserAsync(PRIVACY_URL)}
                >
                  Privacy Policy
                </AppText>
                .
              </AppText>
            </Checkbox>
            <Checkbox
              testID="signup.alerts"
              checked={alerts}
              onChange={setAlerts}
              accessibilityLabel="I would like to receive relevant job alerts, career opportunities and updates from APRONHANGER. (Optional)"
            >
              I would like to receive relevant job alerts, career opportunities and updates from APRONHANGER.
              (Optional)
            </Checkbox>
          </>
        ) : (
          <>
            <AppText color="mutedForeground">{`Enter the OTP sent to ${draft?.mobile ?? ''}.`}</AppText>
            <TextButton
              testID="signup.edit"
              label="Edit signup details"
              onPress={() => {
                setFormError(undefined);
                setStep('details');
              }}
              disabled={working}
            />
            <OtpInput testID="signup.otp" label="Mobile OTP *" value={otp} onChangeText={setOtp} autoFocus />
            <Button
              testID="signup.submit"
              label={working ? 'Please wait…' : 'Verify & create account'}
              variant="gradient"
              loading={busy}
              disabled={working}
              onPress={() => void verifyAndRegister()}
            />
            {success && <LottieAnimation testID="signup.success" name="authSuccess" size={64} />}
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing['4'] },
  heading: { gap: spacing['2'] },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing['2'] },
  badge: {
    backgroundColor: colors.brandSoft,
    borderRadius: radius.full,
    paddingHorizontal: spacing['2'],
    paddingVertical: spacing['0.5'],
  },
  requirement: { flexDirection: 'row', gap: spacing['2'] },
  flex: { flex: 1 },
  requirements: {
    gap: spacing['1'],
    padding: spacing['3'],
    borderRadius: radius.md,
    backgroundColor: colors.muted,
  },
});
