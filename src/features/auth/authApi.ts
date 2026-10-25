// Auth endpoints the candidate website calls (docs/reference/API.md §Auth). Always role CANDIDATE.
// Values go to the backend exactly as typed: it stores and matches the mobile string as is.
import { api } from '@/api/client';
import {
  AuthResponseSchema,
  ResetVerifyResponseSchema,
  SignupVerifyResponseSchema,
} from '@/api/schemas/auth';
import { MessageResponseSchema } from '@/api/schemas/common';

const ROLE = 'CANDIDATE';

export const authApi = {
  login: (body: { email: string; password: string }) => api.post('/api/auth/login', body, AuthResponseSchema),

  sendSignupOtp: (mobile: string) =>
    api.post('/api/auth/signup/send-otp', { mobile, role: ROLE }, MessageResponseSchema),

  verifySignupOtp: async (mobile: string, otp: string) =>
    (await api.post('/api/auth/signup/verify-otp', { mobile, otp, role: ROLE }, SignupVerifyResponseSchema))
      .signup_token,

  register: (draft: { name: string; mobile: string; email: string; password: string; signupToken: string }) =>
    api.post(
      '/api/auth/register',
      {
        name: draft.name,
        mobile: draft.mobile,
        email: draft.email,
        password: draft.password,
        role: ROLE,
        signup_token: draft.signupToken,
      },
      AuthResponseSchema,
    ),

  forgotPassword: (mobile: string) =>
    api.post('/api/auth/forgot-password', { mobile, role: ROLE }, MessageResponseSchema),

  verifyResetOtp: async (mobile: string, otp: string) => {
    const r = await api.post('/api/auth/verify-otp', { mobile, otp, role: ROLE }, ResetVerifyResponseSchema);
    return { resetToken: r.reset_token, maskedEmail: r.maskedEmail };
  },

  resetPassword: (resetToken: string, newPassword: string) =>
    api.post(
      '/api/auth/reset-password',
      { reset_token: resetToken, new_password: newPassword, role: ROLE },
      MessageResponseSchema,
    ),
};
