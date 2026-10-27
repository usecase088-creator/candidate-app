// ../job/backend/src/routes/authRoutes.ts: login, register, GET /me. Loose objects: the backend adds fields freely.
import { z } from 'zod';

export const AuthUserSchema = z
  .object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
    // CANDIDATE | RECRUITER today. A string, so an unexpected role reaches the screen's role check, not a parse error.
    role: z.string(),
    hospitalId: z.string().nullish(),
    candidateId: z.string().nullish(),
  })
  .loose();

export type AuthUser = z.infer<typeof AuthUserSchema>;

/** POST /api/auth/login 200 and POST /api/auth/register 201. */
/** Login and register. The refresh fields come only because the app sends X-Refresh-Capable (backend PR 8). */
export const AuthResponseSchema = z
  .object({
    token: z.string().min(1),
    refreshToken: z.string().min(1).optional(),
    expiresIn: z.number().optional(),
    user: AuthUserSchema,
  })
  .loose();

/** POST /api/auth/refresh. */
export const RefreshResponseSchema = z
  .object({ token: z.string().min(1), refreshToken: z.string().min(1), expiresIn: z.number().optional() })
  .loose();

/** GET /api/auth/me 200. */
export const MeResponseSchema = z.object({ user: AuthUserSchema }).loose();

/** POST /api/auth/signup/verify-otp 200. */
export const SignupVerifyResponseSchema = z.object({ signup_token: z.string().min(1) }).loose();

/** POST /api/auth/verify-otp 200 (forgot password). */
export const ResetVerifyResponseSchema = z
  .object({ reset_token: z.string().min(1), maskedEmail: z.string() })
  .loose();
