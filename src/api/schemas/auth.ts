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
export const AuthResponseSchema = z.object({ token: z.string().min(1), user: AuthUserSchema }).loose();

/** GET /api/auth/me 200. */
export const MeResponseSchema = z.object({ user: AuthUserSchema }).loose();
