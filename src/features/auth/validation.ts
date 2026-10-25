// Same rules and messages as the website (../job/candidates/src/lib/validations.ts, routes/auth*.tsx).
// Values are never trimmed or normalised: the backend stores and matches them exactly as typed (API.md notes).
import { z } from 'zod';

/** validations.ts:86 */
const phoneSchema = z
  .string()
  .min(10, 'Enter a valid 10-digit phone number')
  .max(15, 'Phone number is too long')
  .regex(/^[\d\s+\-()]+$/, 'Phone number can only contain digits and + - ( )');

/** validations.ts:272 authSignInSchema */
export const loginSchema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
export type LoginValues = z.infer<typeof loginSchema>;

/** validations.ts:277 authSignUpSchema */
export const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  mobile: phoneSchema,
  email: z.email('Enter a valid email'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});
export type SignupValues = z.infer<typeof signupSchema>;

/** The website's red box shows the first error in field order. */
export function firstError<K extends string>(
  errors: Partial<Record<K, { message?: string } | undefined>>,
  order: readonly K[],
): string | undefined {
  for (const field of order) {
    const message = errors[field]?.message;
    if (message) return message;
  }
  return undefined;
}

export const OTP_ERROR = 'Please enter a valid 6-digit OTP.';
export const otpError = (otp: string) => (/^\d{6}$/.test(otp) ? undefined : OTP_ERROR);

/** Forgot password, phone step: the website only checks that something was entered. */
export const resetPhoneError = (phone: string) =>
  phone.trim() ? undefined : 'Please enter your registered mobile number.';

/** Forgot password, reset step: checked in this order, messages end with a full stop (unlike signup). */
export function resetPasswordError(password: string): string | undefined {
  if (!password) return 'Password is required.';
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter.';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must contain at least one special character.';
  return undefined;
}
