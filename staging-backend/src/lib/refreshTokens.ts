/**
 * Refresh tokens for the mobile app.
 *
 * The app signs in once and then keeps a short access token (30 minutes) fresh with a long refresh token (90 days).
 * Every use of a refresh token swaps it for a new one ("rotation"). If a retired token shows up again after a short
 * grace period it was copied, so the whole sign-in (the "family") is cancelled. Only a hash is stored.
 *
 * The website never asks for this (it needs the header X-Refresh-Capable: 1), so its 15-day token is unchanged.
 */
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { Request } from 'express';
import jwt from 'jsonwebtoken';
import prisma from './prisma';

export const ACCESS_TOKEN_SECONDS = 30 * 60;
const REFRESH_DAYS = 90;
/** A retired token used again within this time is a retried request, not theft. */
const GRACE_MS = 10_000;

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

/** The app sends X-Refresh-Capable: 1 when it knows how to use refresh tokens. Older builds do not, and keep the long token. */
export const wantsRefresh = (req: Request) => req.headers['x-refresh-capable'] === '1';

export function signAccessToken(
  user: { id: string; email: string; name: string; role: string; hospitalId?: string | null; tokenVersion: number },
  candidateId: string | null,
  expiresIn: number | string,
): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      hospitalId: user.hospitalId ?? undefined,
      candidateId,
      tokenVersion: user.tokenVersion,
    },
    secret,
    { expiresIn: expiresIn as never },
  );
}

/** A new refresh token for `user`; starts a new family unless one is given. */
export async function issueRefreshToken(user: { id: string; tokenVersion: number }, familyId: string = randomUUID()) {
  const token = `rt_${randomBytes(32).toString('base64url')}`;
  const expiresAt = new Date(Date.now() + REFRESH_DAYS * 24 * 3600 * 1000);
  await prisma.refreshToken.create({
    data: { userId: user.id, familyId, tokenHash: hashToken(token), tokenVersion: user.tokenVersion, expiresAt },
  });
  return { token, expiresAt };
}

const revokeFamily = (familyId: string) =>
  prisma.refreshToken.updateMany({ where: { familyId, revokedAt: null }, data: { revokedAt: new Date() } });

export type Rotation =
  | { status: 'invalid' }
  | { status: 'ok'; userId: string; familyId: string; tokenVersion: number };

/**
 * Checks a presented refresh token and retires it. Returns who it belongs to; the caller checks the account and
 * issues the new tokens (issueRefreshToken with the same familyId).
 */
export async function consumeRefreshToken(presented: unknown, now: Date = new Date()): Promise<Rotation> {
  if (typeof presented !== 'string' || presented.length < 20 || presented.length > 200) return { status: 'invalid' };
  const row = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(presented) } });
  if (!row || row.revokedAt || row.expiresAt <= now) return { status: 'invalid' };
  if (row.replacedAt) {
    // Already swapped for a newer one. Soon after: a retry. Later: somebody kept a copy.
    if (now.getTime() - row.replacedAt.getTime() > GRACE_MS) {
      await revokeFamily(row.familyId);
      return { status: 'invalid' };
    }
  } else {
    await prisma.refreshToken.update({ where: { id: row.id }, data: { replacedAt: now } });
  }
  return { status: 'ok', userId: row.userId, familyId: row.familyId, tokenVersion: row.tokenVersion };
}

export { revokeFamily };

/** Sign-out: cancel the whole sign-in this token belongs to. Unknown tokens are ignored. */
export async function revokeByToken(presented: unknown): Promise<void> {
  if (typeof presented !== 'string' || presented.length > 200) return;
  const row = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(presented) } });
  if (row) await revokeFamily(row.familyId);
}
