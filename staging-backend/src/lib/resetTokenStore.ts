import crypto from 'crypto';
import prisma from './prisma';

/**
 * Issue a one-time token tied to a mobile + role.
 * Expires in 15 minutes.
 */
export async function generateResetToken(mobile: string, role: 'RECRUITER' | 'CANDIDATE'): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  
  await prisma.resetToken.create({
    data: {
      token,
      mobile,
      role,
      expiresAt
    }
  });
  
  return token;
}

/**
 * Validate and return the mobile associated with the token.
 * Returns null if not found, wrong role, or expired.
 */
export async function validateResetToken(token: string, role: 'RECRUITER' | 'CANDIDATE'): Promise<string | null> {
  const entry = await prisma.resetToken.findUnique({
    where: { token }
  });
  
  if (!entry) return null;
  if (entry.role !== role) return null;
  if (Date.now() > entry.expiresAt.getTime()) {
    await prisma.resetToken.delete({ where: { token } });
    return null;
  }
  return entry.mobile;
}

/** Consume (delete) the token after a successful password reset. */
export async function deleteResetToken(token: string): Promise<void> {
  await prisma.resetToken.deleteMany({
    where: { token }
  });
}
