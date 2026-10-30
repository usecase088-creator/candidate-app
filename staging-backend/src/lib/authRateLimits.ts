import type { Request } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

/**
 * Limits for sign-in and OTP routes that count PEOPLE, not addresses.
 *
 * Before, one counter per IP covered every OTP route (5 requests in 15 minutes for everybody behind that address) and
 * sign-in allowed 20 per IP. On Jio/Airtel and in offices many users share one address, so a handful of people could
 * lock out everyone else. Now:
 *   - sign-in:  10 tries per email per 15 minutes
 *   - OTP send (send-otp, forgot-password, resend-otp): 5 per mobile number per 15 minutes (each one costs an SMS)
 *   - OTP check (verify-otp, signup verify, reset-password): 10 per mobile number per 15 minutes
 *   - a high safety net per IP stays: 100 sign-ins and 40 OTP requests per 15 minutes, against one address trying
 *     many different people.
 * Same wording as before. A request without the field is counted by its IP.
 */
export type AuthRateLimitOptions = {
  loginIpMax?: number;
  otpIpMax?: number;
  loginEmailMax?: number;
  otpSendMax?: number;
  otpVerifyMax?: number;
};

const WINDOW_MS = 15 * 60 * 1000;

function mobileKey(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  // Same number written +91 98765 43210, 9876543210, 98765 43210: keep the last 10 digits.
  const digits = value.replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : null;
}

function emailKey(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : null;
}

const byIp = (req: Request) => `ip:${ipKeyGenerator(req.ip ?? '')}`;

function limiter(max: number, message: string, key: (req: Request) => string) {
  return rateLimit({
    windowMs: WINDOW_MS,
    limit: max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: key,
  });
}

export function createAuthRateLimits(options: AuthRateLimitOptions = {}) {
  const limits = {
    loginIpMax: options.loginIpMax ?? 100,
    otpIpMax: options.otpIpMax ?? 40,
    loginEmailMax: options.loginEmailMax ?? 10,
    otpSendMax: options.otpSendMax ?? 5,
    otpVerifyMax: options.otpVerifyMax ?? 10,
  };
  const loginMessage = 'Too many login attempts, please try again after 15 minutes';
  const otpMessage = 'Too many OTP requests, please try again after 15 minutes';
  const body = (req: Request) => (req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {});

  const loginIp = limiter(limits.loginIpMax, loginMessage, byIp);
  const loginEmail = limiter(limits.loginEmailMax, loginMessage, (req) => {
    const email = emailKey(body(req).email);
    return email ? `email:${email}` : byIp(req);
  });
  const otpIp = limiter(limits.otpIpMax, otpMessage, byIp);
  const otpSendMobile = limiter(limits.otpSendMax, otpMessage, (req) => {
    const m = mobileKey(body(req).mobile);
    return m ? `send:${m}` : `send:${byIp(req)}`;
  });
  const otpVerifyMobile = limiter(limits.otpVerifyMax, otpMessage, (req) => {
    const m = mobileKey(body(req).mobile);
    return m ? `verify:${m}` : `verify:${byIp(req)}`;
  });

  return {
    limits,
    /** POST /api/auth/login and /register: the person first, then the address. */
    login: [loginEmail, loginIp],
    /** send-otp, forgot-password, resend-otp. */
    otpSend: [otpSendMobile, otpIp],
    /** verify-otp (both), reset-password. */
    otpVerify: [otpVerifyMobile, otpIp],
  };
}
