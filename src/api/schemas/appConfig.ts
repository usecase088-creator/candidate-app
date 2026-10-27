// GET /api/app-config (new in Phase 4, backend PR 4): lowest allowed app version per platform and feature flags.
import { z } from 'zod';

export const AppConfigSchema = z
  .object({
    minVersion: z.object({ android: z.string(), ios: z.string() }).loose(),
    flags: z.record(z.string(), z.boolean()).default({}),
  })
  .loose();
export type AppConfig = z.infer<typeof AppConfigSchema>;
