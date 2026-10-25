import logger from '../../lib/logger';
import { Router, Response } from 'express';
import prisma from '../../lib/prisma';
import { requireAdmin, AdminAuthRequest } from '../../middleware/auth';

const router = Router();

function monthRange(base: Date, offsetFromEnd: number) {
  const d = new Date(base.getFullYear(), base.getMonth() - (5 - offsetFromEnd), 1);
  return {
    label: d.toLocaleString('default', { month: 'short' }),
    start: new Date(d.getFullYear(), d.getMonth(), 1),
    end: new Date(d.getFullYear(), d.getMonth() + 1, 1),
  };
}

// GET /api/admin/stats
router.get('/stats', requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => monthRange(now, i));

    const [
      totalHospitals,
      totalRecruiters,
      totalCandidates,
      totalJobs,
      activeSubscriptions,
      interviewsScheduled,
      offersReleased,
      candidatesJoined,
      pendingVerifications,
      revenueResult,
      flaggedJobs,
      flaggedApplications,
      jobDistribution,
      recentActivityLogs,
    ] = await Promise.all([
      prisma.hospital.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { role: 'RECRUITER', deletedAt: null } }),
      prisma.candidate.count({ where: { deletedAt: null } }),
      prisma.job.count({ where: { status: 'Active' } }),
      prisma.hospital.count({ where: { deletedAt: null, isSuspended: false, planExpiresAt: { gt: new Date() } } }),
      prisma.application.count({ where: { status: 'InterviewScheduled' } }),
      prisma.application.count({ where: { status: { in: ['OfferSent', 'OfferAccepted', 'OfferRejected'] } } }),
      prisma.application.count({ where: { status: 'Joined' } }),
      prisma.hospital.count({ where: { onboardingStatus: 'Pending', deletedAt: null } }),
      prisma.planChangeLog.aggregate({ _sum: { amountPaid: true }, where: { paymentStatus: 'Paid' } }),
      prisma.job.findMany({ where: { isFlagged: true }, include: { hospital: true } }),
      prisma.application.findMany({ where: { isFlagged: true }, include: { job: true, candidate: true } }),
      prisma.job.groupBy({ by: ['category'], _count: { id: true } }),
      prisma.activityLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { id: true, entityType: true, entityId: true, action: true, actorRole: true, createdAt: true }
      }),
    ]);

    const monthlyTrend = await Promise.all(
      months.map(async (m) => ({
        name: m.label,
        jobs: await prisma.job.count({ where: { createdAt: { gte: m.start, lt: m.end } } }),
        applications: await prisma.application.count({ where: { appliedOn: { gte: m.start, lt: m.end } } }),
      })),
    );

    const userGrowth = await Promise.all(
      months.map(async (m) => ({
        name: m.label,
        candidates: await prisma.candidate.count({ where: { createdAt: { gte: m.start, lt: m.end } } }),
        hospitals: await prisma.hospital.count({ where: { submittedAt: { gte: m.start, lt: m.end }, deletedAt: null } }),
      })),
    );

    const revenueTrend = await Promise.all(
      months.map(async (m) => {
        const rev = await prisma.planChangeLog.aggregate({
          where: { paymentStatus: 'Paid', effectiveAt: { gte: m.start, lt: m.end } },
          _sum: { amountPaid: true },
        });
        return { name: m.label, revenue: rev._sum.amountPaid || 0 };
      }),
    );

    const roleDistribution = jobDistribution.map(d => ({ name: d.category || 'Other', value: d._count.id }));

    res.json({
      kpiData: {
        totalHospitals,
        totalRecruiters,
        totalCandidates,
        totalJobs,
        activeSubscriptions,
        interviewsScheduled,
        offersReleased,
        candidatesJoined,
        pendingVerifications,
        totalRevenue: revenueResult._sum.amountPaid || 0,
      },
      flaggedItems: [
        ...flaggedJobs.map(j => ({ id: j.id, type: 'job', text: `Job flagged: ${j.role} at ${j.hospital?.name || 'Unknown'}`, time: j.createdAt })),
        ...flaggedApplications.map(a => ({ id: a.id, type: 'application', text: `Application flagged: ${a.candidate?.name} for ${a.job?.role}`, time: a.appliedOn }))
      ],
      activityFeed: recentActivityLogs.map(l => ({
        id: l.id,
        type: l.entityType === 'job' ? 'job' : l.entityType === 'hospital' ? 'registration' : l.actorRole === 'ADMIN' ? 'verification' : 'application',
        text: `${l.entityType} ${l.action}`,
        time: l.createdAt,
      })),
      monthlyTrend,
      userGrowth,
      roleDistribution,
      revenueTrend
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
