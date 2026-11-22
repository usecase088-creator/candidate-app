// Create account — website auth.tsx (mode "signup"), docs/reference/SCREENS.md §1: details → OTP on one screen.
import { zodResolver } from '@hookform/resolvers/zod';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
import { Controller, type FieldErrors, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { isApiError } from '@/api/errors';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Icon } from '@/components/ui/Icon';
import { LottieAnimation } from '@/components/ui/LottieAnimation';
import { OtpInput } from '@/components/ui/OtpInput';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Pill } from '@/components/ui/Pill';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/Text';
import { TextButton } from '@/components/ui/TextButton';
import { TextInput, type TextInputRef } from '@/components/ui/TextInput';
import { useToast } from '@/components/ui/Toast';
import { authApi } from '@/features/auth/authApi';
import { AuthModeTabs } from '@/features/auth/components/AuthModeTabs';
import { FormMessage } from '@/features/auth/components/FormMessage';
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
  // True from the moment a code is sent for checking until it fails: the 6th digit submits on its own (onComplete),
  // so a press on Verify that lands before the button re-renders as disabled must not send the code twice.
  const verifying = useRef(false);
  // R3 #15: a fast double tap on Send OTP must not send two SMS (the second can make the first code invalid).
  const sending = useRef(false);

  useEffect(() => () => clearTimeout(timer.current), []);

  const { control, handleSubmit, formState } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', mobile: '', email: '', password: '' },
  });

  const fail = (message: string) => {
    setFormError(message);
    toast.show(message, { variant: 'error' });
    setBusy(false);
    verifying.current = false;
  };

  const sendOtp = async (values: SignupValues) => {
    if (!terms || !privacy) return setFormError(CONSENT_ERROR);
    if (sending.current) return;
    sending.current = true;
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
    } finally {
      sending.current = false;
    }
  };

  const verifyAndRegister = async (code = otp) => {
    if (verifying.current) return;
    if (!draft) return setStep('details');
    const invalid = otpError(code);
    if (invalid) return setFormError(invalid);
    verifying.current = true;
    setFormError(undefined);
    setBusy(true);

    let signupToken: string;
    try {
      signupToken = await authApi.verifySignupOtp(draft.mobile, code);
    } catch (e) {
      // Website: the server's message or "Invalid OTP."; network as for sign-in.
      if (isApiError(e) && e.kind === 'http') return fail(e.serverMessage ?? 'Invalid OTP.');
      return fail(loginErrorMessage(e));
    }

    try {
      const { token, user, refreshToken } = await authApi.register({ ...draft, signupToken });
      toast.show('Account created!', { variant: 'success' });
      setSuccess(true);
      timer.current = setTimeout(() => {
        signIn(token, user, refreshToken).catch(() => {
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
      <View style={styles.page}>
        <AuthModeTabs active="signup" />
        <View style={styles.group}>
          <Pill testID="signup.role" label="Candidate" tone="brand" />
          <AppText variant="display">Create your account</AppText>
          <AppText color="mutedForeground">
            Join 1.2L+ verified healthcare professionals across India.
          </AppText>
        </View>

        <FormMessage testID="signup.error" tone="error" message={formError} />

        {step === 'details' ? (
          <>
            <View style={styles.fields}>
              <Controller
                control={control}
                name="name"
                render={({ field }) => (
                  <TextInput
                    testID="signup.name"
                    label="Full name"
                    required
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
                    label="Mobile Number"
                    required
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
                    label="Email"
                    required
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
                    label="Password"
                    required
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
                <AppText variant="secondary" weight="semibold">
                  Password Requirements:
                </AppText>
                {REQUIREMENTS.map((r, i) => (
                  <View key={r} style={styles.requirement}>
                    <Icon
                      testID={`signup.requirement.${i}.icon`}
                      name={DOT}
                      size={DOT_SIZE}
                      tintColor={colors.mutedForeground}
                    />
                    <AppText variant="secondary" color="mutedForeground" style={styles.flex}>
                      {r}
                    </AppText>
                  </View>
                ))}
              </View>
            </View>

            <View testID="signup.consent" style={styles.group}>
              <Checkbox
                testID="signup.terms"
                checked={terms}
                onChange={setTerms}
                invalid={formError === CONSENT_ERROR}
                accessibilityLabel="I have read and agree to the Terms & Conditions."
                // R3 a11y P2-11: the link inside the row cannot be focused by a screen reader: offer it as an action.
                linkAction={{
                  label: 'Open Terms & Conditions',
                  onOpen: () => void WebBrowser.openBrowserAsync(TERMS_URL),
                }}
              >
                <AppText variant="label" weight="regular">
                  I have read and agree to the{' '}
                  <AppText
                    testID="signup.terms.link"
                    variant="label"
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
                linkAction={{
                  label: 'Open Privacy Policy',
                  onOpen: () => void WebBrowser.openBrowserAsync(PRIVACY_URL),
                }}
              >
                <AppText variant="label" weight="regular">
                  I consent to the collection, processing, storage and sharing of my personal and professional
                  information for recruitment purposes as described in the{' '}
                  <AppText
                    testID="signup.privacy.link"
                    variant="label"
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
                <AppText variant="label" weight="regular">
                  I would like to receive relevant job alerts, career opportunities and updates from
                  APRONHANGER. (Optional)
                </AppText>
              </Checkbox>
            </View>

            <Button
              testID="signup.submit"
              label={busy ? 'Please wait…' : 'Send OTP'}
              haptic="medium"
              loading={busy}
              disabled={working}
              onPress={() => void submitDetails()}
            />
          </>
        ) : (
          <>
            <View style={styles.group}>
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
            </View>
            {/* One field: the button stays inline right under it, so it is never hidden by the keyboard. */}
            <View style={styles.fields}>
              <OtpInput
                testID="signup.otp"
                label="Mobile OTP"
                required
                value={otp}
                onChangeText={setOtp}
                onComplete={(code) => void verifyAndRegister(code)}
                autoFocus
              />
              <Button
                testID="signup.submit"
                label={working ? 'Please wait…' : 'Verify & create account'}
                haptic="medium"
                loading={busy}
                disabled={working}
                onPress={() => void verifyAndRegister()}
              />
              {success && <LottieAnimation testID="signup.success" name="authSuccess" size={64} />}
            </View>
          </>
        )}
      </View>
    </Screen>
  );
}

const DOT = { ios: 'circle.fill', android: 'circle', web: 'circle' } as const;
const DOT_SIZE = 6;

const styles = StyleSheet.create({
  // D32 rhythm: sections 24 apart, items inside a group 8, fields 16.
  page: { gap: spacing['6'] },
  group: { gap: spacing['2'] },
  fields: { gap: spacing['4'] },
  requirement: { flexDirection: 'row', alignItems: 'center', gap: spacing['2'] },
  flex: { flex: 1 },
  requirements: {
    gap: spacing['1'],
    padding: spacing['3'],
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
  },
});
