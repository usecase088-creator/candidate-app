import { z } from 'zod';

import { api } from '@/api/client';

const Ok = z.object({ success: z.boolean() }).loose();

export const accountApi = {
  /** Backend PR 9. A wrong password answers 400 "Incorrect password" (never 401, which the app reads as signed out). */
  deleteAccount: (password: string) => api.post('/api/account/delete', { password }, Ok),
};
