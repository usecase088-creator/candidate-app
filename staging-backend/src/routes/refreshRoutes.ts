import { Router, Request, Response } from 'express';
import logger from '../lib/logger';
import prisma from '../lib/prisma';
import {
  ACCESS_TOKEN_SECONDS,
  consumeRefreshToken,
  issueRefreshToken,
  revokeByToken,
  revokeFamily,
  signAccessToken,
} from '../lib/refreshTokens';

const router = Router();
const EXPIRED = { error: 'Session expired. Please log in again.' };

// POST /api/auth/refresh  { refreshToken }  → { token, refreshToken, expiresIn, user }
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const result = await consumeRefreshToken(req.body?.refreshToken);
    if (result.status !== 'ok') {
      res.status(401).json(EXPIRED);
      return;
    }
    const user = await prisma.user.findUnique({
      where: { id: result.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        hospitalId: true,
        tokenVersion: true,
        isSuspended: true,
        deletedAt: true,
        hospital: { select: { isSuspended: true, deletedAt: true } },
      },
    });
    // Gone, deleted, or the password was reset since this sign-in (tokenVersion moved on): the sign-in is over.
    if (!user || user.deletedAt || user.tokenVersion !== result.tokenVersion) {
      await revokeFamily(result.familyId);
      res.status(401).json(EXPIRED);
      return;
    }
    if (user.isSuspended) {
      res.status(403).json({ error: 'Your account has been suspended. Please contact support.' });
      return;
    }
    if (user.hospital && (user.hospital.isSuspended || user.hospital.deletedAt)) {
      res.status(403).json({ error: 'Your hospital account has been suspended or deleted.' });
      return;
    }
    let candidateId: string | null = null;
    if (user.role === 'CANDIDATE') {
      const candidate = await prisma.candidate.findUnique({ where: { userId: user.id }, select: { id: true } });
      candidateId = candidate?.id ?? null;
    }
    const token = signAccessToken(user, candidateId, ACCESS_TOKEN_SECONDS);
    const next = await issueRefreshToken(user, result.familyId);
    res.json({
      token,
      refreshToken: next.token,
      expiresIn: ACCESS_TOKEN_SECONDS,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, hospitalId: user.hospitalId, candidateId },
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Could not refresh the session' });
  }
});

// POST /api/auth/logout  { refreshToken }  → ends that sign-in. Always 200: signing out must never fail.
router.post('/logout', async (req: Request, res: Response) => {
  try {
    await revokeByToken(req.body?.refreshToken);
  } catch (error) {
    logger.error(error);
  }
  res.json({ success: true });
});

export default router;
