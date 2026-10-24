import Constants from 'expo-constants';
import { z } from 'zod';

// Validates the per-variant values that app.config.ts puts in `extra`.
// A bad build should crash at start with a clear message, not fail later on a network call.
const envSchema = z
  .object({
    appVariant: z.enum(['development', 'preview', 'production']),
    apiUrl: z.url(),
    sentryEnvironment: z.string().min(1),
    sentryDsn: z
      .union([z.url(), z.literal('')])
      .optional()
      .transform((dsn) => dsn || undefined),
  })
  .superRefine((env, ctx) => {
    if (env.appVariant !== 'development' && !env.apiUrl.startsWith('https://')) {
      ctx.addIssue({ code: 'custom', path: ['apiUrl'], message: 'must use https outside development' });
    }
  });

export type Env = z.infer<typeof envSchema>;

export function parseEnv(raw: unknown): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid app config (app.config.ts extra): ${details}`);
  }
  return result.data;
}

let cached: Env | undefined;

/** The validated config of this build. Throws on first use if the build config is broken. */
export function getEnv(): Env {
  cached ??= parseEnv(Constants.expoConfig?.extra);
  return cached;
}
