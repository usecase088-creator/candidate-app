import { Router } from 'express';
import { readAppConfig } from '../lib/appConfig';

const router = Router();

// GET /api/app-config: public, no database. The app calls it at start (force-update screen, feature flags).
router.get('/', (_req, res) => {
  res.set('Cache-Control', 'public, max-age=60');
  res.json(readAppConfig());
});

export default router;
