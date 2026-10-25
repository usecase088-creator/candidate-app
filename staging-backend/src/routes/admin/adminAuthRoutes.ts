import logger from '../../lib/logger';
import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../lib/prisma';
import { requireAdmin, AdminAuthRequest } from '../../middleware/auth';

const router = Router();
const SECRET = process.env.JWT_SECRET;
if (!SECRET) throw new Error('FATAL: JWT_SECRET environment variable is not set.');
const VERIFIED_SECRET = SECRET as string;

// POST /api/admin/auth/login
router.post('/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }
  try {
    const admin = await prisma.adminUser.findUnique({ where: { email: email.toLowerCase() } });
    if (!admin) {
      res.status(401).json({ error: 'Invalid admin credentials' });
      return;
    }
    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid admin credentials' });
      return;
    }

    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() }
    });

    const token = jwt.sign(
      { id: admin.id, email: admin.email, name: admin.name, role: 'ADMIN', tokenVersion: admin.tokenVersion },
      VERIFIED_SECRET,
      { expiresIn: '12h' }
    );

    res.json({ token, user: { id: admin.id, email: admin.email, name: admin.name, role: 'ADMIN' } });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Admin login failed' });
  }
});

// POST /api/admin/auth/logout-all
router.post('/auth/logout-all', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    await prisma.adminUser.update({
      where: { id: req.admin!.id },
      data: { tokenVersion: { increment: 1 } },
    });
    res.json({ ok: true });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to invalidate admin sessions' });
  }
});

// GET /api/admin/auth/me
router.get('/auth/me', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  res.json({ user: { ...req.admin, role: 'ADMIN' } });
});

export default router;