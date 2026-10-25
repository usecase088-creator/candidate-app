import crypto from 'crypto';
import prisma from './prisma';

type SignupRole = 'RECRUITER' | 'CANDIDATE';

const SIGNUP_TOKEN_TTL_MS = 15 * 60 * 1000;

export async function generateSignupToken(mobile: string, role: SignupRole): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SIGNUP_TOKEN_TTL_MS);

  await prisma.otpVerificationToken.create({
    data: {
      token,
      mobile,
      role,
      purpose: 'signup',
      expiresAt,
    },
  });

  return token;
}

export async function validateSignupToken(
  token: string,
  mobile: string,
  role: SignupRole,
): Promise<boolean> {
  const entry = await prisma.otpVerificationToken.findUnique({
    where: { token },
  });

  if (!entry) return false;
  if (entry.purpose !== 'signup') return false;
  if (entry.mobile !== mobile) return false;
  if (entry.role !== role) return false;
  if (Date.now() > entry.expiresAt.getTime()) {
    await prisma.otpVerificationToken.deleteMany({ where: { token } });
    return false;
  }

  return true;
}

export async function deleteSignupToken(token: string): Promise<void> {
  await prisma.otpVerificationToken.deleteMany({
    where: { token },
  });
}
