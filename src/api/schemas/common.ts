import { z } from 'zod';

/** `{ message }` replies (send OTP, reset password, ...). */
export const MessageResponseSchema = z.object({ message: z.string() }).loose();
