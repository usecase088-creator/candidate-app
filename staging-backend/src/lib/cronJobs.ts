import cron from 'node-cron';
import prisma from './prisma';
import logger from './logger';
import { getRecruiterLimit } from './helpers';
import { isDowngrade, isUpgrade } from './planBilling';
import { BILLING_CYCLE_DAYS, getPlanPrice, getJobLimit } from '../config/plans';
import { closePlanExpiredActiveJobs, closeExpiredJobs } from './hospitalSuspend';
import { computeRecruiterActivationPlan, applyRecruiterActivationPlan } from './recruiterPlan';

export function initCronJobs() {
  // Run every hour to check for expired jobs
  cron.schedule('0 * * * *', async () => {
    try {
      logger.info('Running cron job: Checking for expired jobs...');
      const now = new Date();

      const expiredJobs = await prisma.job.findMany({
        where: {
          status: 'Active',
          visibilityEndsAt: { lte: now }
        }
      });

      if (expiredJobs.length > 0) {
        const jobIds = expiredJobs.map(j => j.id);
        const { jobsClosed } = await closeExpiredJobs(jobIds);
        logger.info(`Cron job finished: Closed ${jobsClosed} expired job(s).`);
      }
    } catch (error) {
      logger.error('Error running expired jobs cron job: ' + error);
    }
  });

  // ─── Nightly: Apply pending plan changes at renewal ─────────────────────────
  // Runs at 00:05 every day. Finds hospitals whose planExpiresAt has passed
  // AND have a pendingPlan. Only downgrades (or moves to free tiers) are applied
  // without payment — paid-tier upgrades require checkout and are not applied here.
  cron.schedule('5 0 * * *', async () => {
    try {
      logger.info('Running cron job: Processing pending plan renewals...');
      const now = new Date();

      const hospitals = await prisma.hospital.findMany({
        where: {
          onboardingStatus: 'Approved',
          planExpiresAt: { lte: now },
        },
        include: { users: { where: { role: 'RECRUITER' } } },
      });

      for (const hospital of hospitals) {
        if (!hospital.pendingPlan) {
          // Lapse-to-Basic path or Basic auto-renewal
          const fromPlan = hospital.onboardingPlan;
          const toPlan = 'Basic';
          const changeType = isDowngrade(fromPlan, toPlan) ? 'scheduled_downgrade' : 'renewal';

          const newExpiresAt = new Date();
          newExpiresAt.setDate(newExpiresAt.getDate() + BILLING_CYCLE_DAYS);
          newExpiresAt.setUTCHours(23, 59, 59, 999);
          const newMaxRecruiters = getRecruiterLimit(toPlan);

          await prisma.$transaction([
            prisma.hospital.update({
              where: { id: hospital.id },
              data: {
                onboardingPlan: toPlan,
                planExpiresAt: newExpiresAt,
                maxRecruiters: newMaxRecruiters,
              },
            }),
            prisma.user.updateMany({
              where: { hospitalId: hospital.id, role: 'RECRUITER' },
              data: {
                jobsPostedThisMonth: 0,
                premiumSearchesThisMonth: 0,
                currentMonthStartDate: new Date(),
              },
            }),
            prisma.planChangeLog.create({
              data: {
                hospitalId: hospital.id,
                fromPlan,
                toPlan,
                changeType,
                amountPaid: null,
                effectiveAt: now,
                paymentStatus: 'Waived',
                note: changeType === 'scheduled_downgrade' ? `Plan lapsed to ${toPlan}.` : `Plan auto-renewed to ${toPlan}.`,
              },
            }),
          ]);

          if (changeType === 'scheduled_downgrade') {
            await closePlanExpiredActiveJobs(hospital.id);
            const planData = await computeRecruiterActivationPlan(hospital.id, newMaxRecruiters);
            await applyRecruiterActivationPlan(planData, `Plan lapsed to ${toPlan}`);
          }

          if (hospital.users.length > 0) {
            await prisma.inAppNotification.createMany({
              data: hospital.users.map((u) => ({
                userId: u.id,
                title: changeType === 'scheduled_downgrade' ? 'Plan Lapsed to Basic' : 'Plan Auto-Renewed',
                message: changeType === 'scheduled_downgrade'
                  ? `Your hospital plan has expired and lapsed to Basic. A new billing cycle has started.`
                  : `Your Basic plan has automatically renewed for another cycle.`,
                link: '/settings',
              })),
            });
          }
          logger.info(`Plan ${changeType}: ${hospital.name} — ${fromPlan} → ${toPlan}`);
          continue;
        }

        const fromPlan = hospital.onboardingPlan;
        const toPlan = hospital.pendingPlan;
        const targetPrice = getPlanPrice(toPlan);
        const requiresPayment = isUpgrade(fromPlan, toPlan) && targetPrice > 0;

        if (requiresPayment) {
          // Check if payment was already collected at schedule time
          if (hospital.pendingPlanPaymentRef) {
            // ── Pre-paid scheduled upgrade: apply it ──────────────────────────
            const newExpiresAt = new Date();
            newExpiresAt.setDate(newExpiresAt.getDate() + BILLING_CYCLE_DAYS);
            newExpiresAt.setUTCHours(23, 59, 59, 999);
            const newMaxRecruiters = getRecruiterLimit(toPlan);

            await prisma.$transaction([
              prisma.hospital.update({
                where: { id: hospital.id },
                data: {
                  onboardingPlan: toPlan,
                  planExpiresAt: newExpiresAt,
                  maxRecruiters: newMaxRecruiters,
                  pendingPlan: null,
                  pendingPlanAt: null,
                  pendingPlanPaymentRef: null,
                },
              }),
              prisma.user.updateMany({
                where: { hospitalId: hospital.id, role: 'RECRUITER' },
                data: {
                  jobsPostedThisMonth: 0,
                  premiumSearchesThisMonth: 0,
                  currentMonthStartDate: new Date(),
                },
              }),
              prisma.planChangeLog.create({
                data: {
                  hospitalId: hospital.id,
                  fromPlan,
                  toPlan,
                  changeType: 'scheduled_upgrade',
                  amountPaid: targetPrice,
                  effectiveAt: now,
                  paymentStatus: 'Paid',
                  paymentRef: hospital.pendingPlanPaymentRef,
                  note: `Scheduled upgrade applied at renewal: ${fromPlan} → ${toPlan}. Pre-paid ₹${targetPrice}.`,
                },
              }),
            ]);

            if (hospital.users.length > 0) {
              await prisma.inAppNotification.createMany({
                data: hospital.users.map((u) => ({
                  userId: u.id,
                  title: `Upgraded to ${toPlan}!`,
                  message: `Your scheduled upgrade from ${fromPlan} to ${toPlan} has been applied. A new 30-day cycle has started.`,
                  link: '/settings',
                })),
              });
            }

            logger.info(`Scheduled paid upgrade applied: ${hospital.name} — ${fromPlan} → ${toPlan}`);
            continue;
          }

          // ── No payment collected: clear pending, lapse to Basic ───────────
          await prisma.$transaction([
            prisma.hospital.update({
              where: { id: hospital.id },
              data: {
                pendingPlan: null,
                pendingPlanAt: null,
              },
            }),
            prisma.planChangeLog.create({
              data: {
                hospitalId: hospital.id,
                fromPlan,
                toPlan,
                changeType: 'scheduled_upgrade',
                amountPaid: null,
                effectiveAt: now,
                paymentStatus: 'Pending',
                note: `Scheduled upgrade to ${toPlan} not applied at renewal: payment was not collected. Use Settings to pay and upgrade.`,
              },
            }),
          ]);

          if (hospital.users.length > 0) {
            await prisma.inAppNotification.createMany({
              data: hospital.users.map((u) => ({
                userId: u.id,
                title: 'Scheduled Upgrade Not Applied',
                message: `Your scheduled upgrade to ${toPlan} was not applied because payment is required. Visit Settings to renew or upgrade.`,
                link: '/settings',
              })),
            });
          }

          logger.warn(
            `Scheduled paid upgrade skipped (no payment): ${hospital.name} — ${fromPlan} → ${toPlan}`,
          );

          // Since upgrade failed, we should still renew them on their CURRENT plan or lapse to basic if they were Pro/Premium
          // For simplicity and safety, lapse to Basic so they don't get free Pro/Premium days.
          const lapseToPlan = 'Basic';
          const newExpiresAt = new Date();
          newExpiresAt.setDate(newExpiresAt.getDate() + BILLING_CYCLE_DAYS);
          newExpiresAt.setUTCHours(23, 59, 59, 999);
          const newMaxRecruiters = getRecruiterLimit(lapseToPlan);

          await prisma.$transaction([
            prisma.hospital.update({
              where: { id: hospital.id },
              data: {
                onboardingPlan: lapseToPlan,
                planExpiresAt: newExpiresAt,
                maxRecruiters: newMaxRecruiters,
              },
            }),
            prisma.user.updateMany({
              where: { hospitalId: hospital.id, role: 'RECRUITER' },
              data: {
                jobsPostedThisMonth: 0,
                premiumSearchesThisMonth: 0,
                currentMonthStartDate: new Date(),
              },
            }),
            prisma.planChangeLog.create({
              data: {
                hospitalId: hospital.id,
                fromPlan,
                toPlan: lapseToPlan,
                changeType: isDowngrade(fromPlan, lapseToPlan) ? 'scheduled_downgrade' : 'renewal',
                amountPaid: null,
                effectiveAt: now,
                paymentStatus: 'Waived',
                note: `Plan lapsed to ${lapseToPlan} after failed paid upgrade.`,
              },
            }),
          ]);

          if (isDowngrade(fromPlan, lapseToPlan)) {
            await closePlanExpiredActiveJobs(hospital.id);
            const planData = await computeRecruiterActivationPlan(hospital.id, newMaxRecruiters);
            await applyRecruiterActivationPlan(planData, `Plan lapsed to ${lapseToPlan} after failed upgrade`);
          }

          continue;
        }

        const changeType = isDowngrade(fromPlan, toPlan)
          ? 'scheduled_downgrade'
          : 'scheduled_upgrade';

        // New expiry = 30 days from now
        const newExpiresAt = new Date();
        newExpiresAt.setDate(newExpiresAt.getDate() + BILLING_CYCLE_DAYS);
        newExpiresAt.setUTCHours(23, 59, 59, 999);

        const newMaxRecruiters = getRecruiterLimit(toPlan);

        await prisma.$transaction([
          prisma.hospital.update({
            where: { id: hospital.id },
            data: {
              onboardingPlan: toPlan,
              planExpiresAt: newExpiresAt,
              maxRecruiters: newMaxRecruiters,
              pendingPlan: null,
              pendingPlanAt: null,
            },
          }),
          prisma.user.updateMany({
            where: { hospitalId: hospital.id, role: 'RECRUITER' },
            data: {
              jobsPostedThisMonth: 0,
              premiumSearchesThisMonth: 0,
              currentMonthStartDate: new Date(),
            },
          }),
          prisma.planChangeLog.create({
            data: {
              hospitalId: hospital.id,
              fromPlan,
              toPlan,
              changeType,
              amountPaid: null,
              effectiveAt: now,
              paymentStatus: 'Waived',
              note: `Scheduled plan change applied at renewal: ${fromPlan} → ${toPlan}. No payment required.`,
            },
          }),
        ]);

        if (changeType === 'scheduled_downgrade') {
          await closePlanExpiredActiveJobs(hospital.id);
          const planData = await computeRecruiterActivationPlan(hospital.id, newMaxRecruiters);
          await applyRecruiterActivationPlan(planData, `Downgraded to ${toPlan}`);
        }

        if (hospital.users.length > 0) {
          const title = isDowngrade(fromPlan, toPlan)
            ? 'Plan Downgrade Applied'
            : 'Plan Change Applied';
          const message = isDowngrade(fromPlan, toPlan)
            ? `Your hospital plan has changed from ${fromPlan} to ${toPlan}. A new billing cycle has started.`
            : `Your hospital plan is now ${toPlan}. A new billing cycle has started.`;

          await prisma.inAppNotification.createMany({
            data: hospital.users.map((u) => ({
              userId: u.id,
              title,
              message,
              link: '/settings',
            })),
          });
        }

        logger.info(`Scheduled plan change applied: ${hospital.name} — ${fromPlan} → ${toPlan}`);
      }

      logger.info(`Plan renewal cron finished: processed ${hospitals.length} hospital(s).`);
    } catch (error) {
      logger.error('Error running plan renewal cron job: ' + error);
    }
  });

  // ─── Nightly: Expiry warning notifications ───────────────────────────────────
  // Uses planExpiresAt when set (new billing), falls back to approvedAt+30 (legacy).
  cron.schedule('0 0 * * *', async () => {
    try {
      logger.info('Running cron job: Checking hospital plan expirations...');
      const hospitals = await prisma.hospital.findMany({
        where: { onboardingStatus: 'Approved' }
      });

      for (const hospital of hospitals) {
        // Prefer planExpiresAt; fall back to legacy approvedAt+30
        let expirationDate: Date | null = hospital.planExpiresAt ?? null;
        if (!expirationDate) {
          const start = hospital.approvedAt || hospital.submittedAt;
          if (!start) continue;
          expirationDate = new Date(start);
          expirationDate.setDate(expirationDate.getDate() + BILLING_CYCLE_DAYS);
        }

        const now = new Date();
        const diffMs = expirationDate.getTime() - now.getTime();
        const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

        if (daysRemaining === 7 || daysRemaining === 5 || daysRemaining === 3 || daysRemaining === 1) {
          const recruiters = await prisma.user.findMany({
            where: { hospitalId: hospital.id, role: 'RECRUITER' }
          });

          for (const user of recruiters) {
            const title = 'Plan Expiring Soon';
            const message = `Your ${hospital.onboardingPlan} plan will expire in ${daysRemaining} day(s). Visit Settings to renew or upgrade.`;

            // Prevent duplicate notifications for the same day count
            const existing = await prisma.inAppNotification.findFirst({
              where: { userId: user.id, title, message }
            });

            if (!existing) {
              await prisma.inAppNotification.create({
                data: { userId: user.id, title, message, link: '/settings' }
              });
            }
          }
        }
      }
      logger.info('Cron job finished: Checked hospital plan expirations.');
    } catch (error) {
      logger.error('Error running expiration notifications cron job: ' + error);
    }
  });

  logger.info('Cron jobs initialized successfully.');
}
