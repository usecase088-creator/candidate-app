import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

// Load environment variables (ensure this is at the top)
import 'dotenv/config';


import { initSentry, captureException } from './lib/sentry';
initSentry();

import prisma from './lib/prisma';

// Logger
import logger from './lib/logger';

// Import Routes
import authRoutes from './routes/authRoutes';
import jobRoutes from './routes/jobRoutes';
import hospitalRoutes from './routes/hospitalRoutes';
import applicationRoutes from './routes/applicationRoutes';
import candidateRoutes from './routes/candidateRoutes';
import savedJobRoutes from './routes/savedJobRoutes';
import searchRoutes from './routes/searchRoutes';
import statsRoutes from './routes/statsRoutes';

// Modular Admin Routes
import adminAuthRoutes from './routes/admin/adminAuthRoutes';
import adminHospitalRoutes from './routes/admin/adminHospitalRoutes';
import adminUserRoutes from './routes/admin/adminUserRoutes';
import adminCandidateRoutes from './routes/admin/adminCandidateRoutes';
import adminStatsRoutes from './routes/admin/adminStatsRoutes';
import adminJobRoutes from './routes/admin/adminJobRoutes';
import adminSystemRoutes from './routes/admin/adminSystemRoutes';
import adminSearchRoutes from './routes/adminSearchRoutes';
import adminNotificationRoutes from './routes/admin/adminNotificationRoutes';
import onboardingRoutes from './routes/onboardingRoutes';
import onboardingVerifyRoutes from './routes/onboardingVerifyRoutes';
import uploadRoutes from './routes/uploadRoutes';
import planRoutes from './routes/planRoutes';
import paymentRoutes from './routes/paymentRoutes';
import webhookRoutes from './routes/webhookRoutes';
import notificationRoutes from './routes/notificationRoutes';
import adminGovJobRoutes from './routes/admin/adminGovJobRoutes';
import govJobRoutes from './routes/govJobRoutes';
import adminIntlJobRoutes from './routes/admin/adminIntlJobRoutes';
import intlJobRoutes from './routes/intlJobRoutes';
import { evaluateCorsOrigin } from './lib/corsConfig';

function requireEnv(name: string): void {
  if (!process.env[name]) {
    throw new Error(`FATAL: ${name} environment variable is not set.`);
  }
}

[
  'DATABASE_URL',
  'JWT_SECRET',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
].forEach(requireEnv);

const app = express();
app.set('trust proxy', 1);

app.use(helmet());

// Request logging via morgan + winston
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat, { stream: { write: (message) => logger.info(message.trim()) } }));

// ─── Webhook routes (RAW BODY — must be before express.json()) ───────────────
// Razorpay signs the raw request bytes. express.json() would destroy the raw
// body, breaking HMAC validation. Mounting here preserves it for the handler.
app.use('/api/webhooks', webhookRoutes);

// Reduce payload limit since base64 CV compat is deprecated
app.use(express.json({ limit: '5mb' }));

// ─── Rate Limiting ───────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per `window` (here, per 15 minutes)
  message: { error: 'Too many login attempts, please try again after 15 minutes' },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

const searchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150, // 150 searches per 15 minutes
  message: { error: 'Too many search requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 uploads per 15 minutes
  message: { error: 'Upload limit reached, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  // LOCAL-ONLY PATCH from apronhanger-app scripts/backend-local/patches.ts: room for E2E runs in test mode.
  max: process.env.OTP_TEST_MODE === 'true' && process.env.NODE_ENV !== 'production' ? 100 : 5,
  message: { error: 'Too many OTP requests, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

const onboardingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { error: 'Too many registration attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many payment requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const publicJobsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many job requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const inviteCodeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many invite code attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── CORS ────────────────────────────────────────────────────────────────────
// In production, configure ALLOWED_ORIGINS in .env
const parseOrigins = (str?: string) => str ? str.split(',').map(s => s.trim().replace(/\/$/, '')) : [];
const originsCandidate = parseOrigins(process.env.ALLOWED_ORIGINS_CANDIDATE);
const originsRecruiter = parseOrigins(process.env.ALLOWED_ORIGINS_RECRUITER);
const originsAdmin = parseOrigins(process.env.ALLOWED_ORIGINS_ADMIN);
const legacyOrigins = parseOrigins(process.env.ALLOWED_ORIGINS);

const allowedOrigins = [...new Set([...originsCandidate, ...originsRecruiter, ...originsAdmin, ...legacyOrigins])];

// Health check — registered before strict CORS (Render/curl probes omit Origin)
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'ok' });
  } catch (e) {
    res.status(503).json({ status: 'error', db: 'unreachable' });
  }
});

// Render pings the root URL by default
app.get('/', (req, res) => {
  res.redirect('/health');
});

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests without an Origin (like Render health checks or curl)
    if (!origin) return callback(null, true);
    
    const result = evaluateCorsOrigin(origin, allowedOrigins, process.env.NODE_ENV || 'development');
    if (result.allowed) return callback(null, true);
    callback(new Error(result.error || 'Not allowed by CORS'));
  },
  credentials: true,
}));

// ─── API Routes ──────────────────────────────────────────────────────────────

// Limiters must be registered BEFORE the routes they protect
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/signup/send-otp', otpLimiter);
app.use('/api/auth/signup/verify-otp', otpLimiter);
app.use('/api/auth/forgot-password', otpLimiter);
app.use('/api/auth/verify-otp', otpLimiter);
app.use('/api/auth/reset-password', otpLimiter);
app.use('/api/auth/resend-otp', otpLimiter);
app.use('/api/onboarding/verify-mobile', otpLimiter);
app.use('/api/onboarding/resend-otp', otpLimiter);

app.use('/api/auth', authRoutes);

// Modular Admin Routes (replaces monolith adminRoutes)
app.use('/api/admin/auth/login', authLimiter);
app.use('/api/admin', adminAuthRoutes);
app.use('/api/admin', adminHospitalRoutes);
app.use('/api/admin', adminUserRoutes);
app.use('/api/admin', adminCandidateRoutes);
app.use('/api/admin', adminStatsRoutes);
app.use('/api/admin', adminJobRoutes);
app.use('/api/admin', adminSystemRoutes);
app.use('/api/admin', adminSearchRoutes);
app.use('/api/admin/notifications', adminNotificationRoutes);
app.use('/api/admin', adminGovJobRoutes);
app.use('/api/admin', adminIntlJobRoutes);

app.use('/api/hospitals', hospitalRoutes);
app.use('/api/gov-jobs', govJobRoutes);
app.use('/api/intl-jobs', intlJobRoutes);
app.use('/api/candidates', searchLimiter, candidateRoutes);
app.use('/api/jobs', publicJobsLimiter, jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/search', searchLimiter, searchRoutes);
app.use('/api/upload', uploadLimiter, uploadRoutes);
app.use('/api/plan', planRoutes);
app.use('/api/payment', paymentLimiter, paymentRoutes);
app.use('/api/notifications', notificationRoutes);

app.use('/api/onboarding/hospitals', onboardingLimiter);
app.use('/api/onboarding/verify-code', inviteCodeLimiter);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/onboarding', onboardingVerifyRoutes);
app.use('/api/saved-jobs', savedJobRoutes);
app.use('/api/dashboard/stats', statsRoutes);

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  captureException(err);
  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });
  res.status(500).json({ error: 'Internal Server Error' });
});

// ─── Server Start ────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  logger.info(`Server running on http://127.0.0.1:${PORT}`);
  
  // Initialize background cron jobs
  import('./lib/cronJobs').then(({ initCronJobs }) => {
    initCronJobs();
  }).catch(err => {
    logger.error('Failed to init cron jobs: ' + err);
  });

  if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
    logger.warn('WARNING: No production CORS origins are configured; browser API requests will be rejected.');
  }
});

// ─── Graceful Shutdown ───────────────────────────────────────────────────────

const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}, closing server...`);
  server.close(async () => {
    logger.info('HTTP server closed.');
    try {
      await prisma.$disconnect();
      logger.info('Prisma disconnected successfully.');
      process.exit(0);
    } catch (err) {
      logger.error('Error during Prisma disconnect: ' + err);
      process.exit(1);
    }
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
