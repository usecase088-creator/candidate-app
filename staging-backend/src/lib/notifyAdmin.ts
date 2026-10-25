import logger from './logger';
import prisma from './prisma';
import { DEFAULT_PLAN_TIER } from '../config/plans';

/** Persist an admin notification and broadcast via prisma adminNotification extension → SSE. */
export async function notifyAdmin({
  title,
  message,
  link,
}: {
  title: string;
  message: string;
  link?: string;
}) {
  try {
    await prisma.adminNotification.create({
      data: { title, message, link: link ?? null },
    });
  } catch (e) {
    logger.warn('[notifyAdmin] Failed to create admin notification: %s', e);
  }
}

export async function notifyAdminHospitalOnboarding(hospital: {
  id: string;
  name: string;
  city?: string | null;
  state?: string | null;
  onboardingPlan?: string | null;
}) {
  const location = [hospital.city, hospital.state].filter(Boolean).join(', ') || 'Unknown location';
  await notifyAdmin({
    title: 'New Hospital Registration',
    message: `${hospital.name} (${location}) submitted onboarding on the ${hospital.onboardingPlan || DEFAULT_PLAN_TIER} plan.`,
    link: '/recruiter-applications',
  });
}

export async function notifyAdminJobPublished(job: {
  id: string;
  role: string;
  hospital?: { name?: string | null } | null;
}) {
  const hospitalName = job.hospital?.name || 'Unknown hospital';
  await notifyAdmin({
    title: 'New Job Published',
    message: `${job.role} at ${hospitalName} is now live.`,
    link: '/jobs',
  });
}
