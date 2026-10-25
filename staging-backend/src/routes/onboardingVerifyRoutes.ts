import logger from '../lib/logger';
import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { verifyOTP, smartResendOTP } from '../lib/otp';

const router = Router();

// POST /api/onboarding/verify-mobile
router.post('/verify-mobile', async (req: Request, res: Response) => {
  try {
    const { applicationId, otp } = req.body;
    if (!applicationId || !otp) {
      res.status(400).json({ error: 'applicationId and otp are required' });
      return;
    }

    const hospital = await prisma.hospital.findUnique({
      where: { id: String(applicationId) }
    });

    if (!hospital) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }

    if (hospital.mobileVerified) {
      res.status(400).json({ error: 'Mobile number is already verified' });
      return;
    }

    if (!hospital.phone) {
      res.status(400).json({ error: 'No phone number associated with this application' });
      return;
    }

    await verifyOTP(hospital.phone, otp);

    await prisma.hospital.update({
      where: { id: hospital.id },
      data: { mobileVerified: true }
    });

    res.json({ message: 'Mobile number verified successfully' });
  } catch (err: any) {
    const status = err.statusCode === 404 ? 400 : (err.statusCode || 400);
    res.status(status).json({ error: err.message });
  }
});

// POST /api/onboarding/resend-otp
router.post('/resend-otp', async (req: Request, res: Response) => {
  try {
    const { applicationId } = req.body;
    if (!applicationId) {
      res.status(400).json({ error: 'applicationId is required' });
      return;
    }

    const hospital = await prisma.hospital.findUnique({
      where: { id: String(applicationId) }
    });

    if (!hospital) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }

    if (hospital.mobileVerified) {
      res.status(400).json({ error: 'Mobile number is already verified' });
      return;
    }

    if (!hospital.phone) {
      res.status(400).json({ error: 'No phone number associated with this application' });
      return;
    }

    await smartResendOTP(hospital.phone);
    res.json({ message: 'OTP resent successfully' });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ error: err.message });
  }
});

export default router;
