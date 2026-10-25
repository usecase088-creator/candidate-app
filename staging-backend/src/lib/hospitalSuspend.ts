import prisma from './prisma';
import { TERMINAL_APP_STATUSES } from './applicationStatuses';

export async function closeAllActiveJobsForHospital(hospitalId: string): Promise<void> {
  const activeJobs = await prisma.job.findMany({
    where: { hospitalId, status: 'Active' },
    select: { id: true },
  });
  if (activeJobs.length === 0) return;
  const jobIds = activeJobs.map((j) => j.id);
  await prisma.$transaction([
    prisma.application.updateMany({
      where: { jobId: { in: jobIds }, status: { notIn: [...TERMINAL_APP_STATUSES] } },
      data: { status: 'JobClosed' },
    }),
    prisma.job.updateMany({
      where: { id: { in: jobIds } },
      data: { status: 'Closed' },
    }),
  ]);
}

export async function closeExcessActiveJobs(hospitalId: string, newLimit: number): Promise<void> {
  const activeJobs = await prisma.job.findMany({
    where: { hospitalId, status: 'Active' },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (activeJobs.length <= newLimit) return;
  const jobIds = activeJobs.slice(0, activeJobs.length - newLimit).map((j) => j.id);
  await prisma.$transaction([
    prisma.application.updateMany({
      where: { jobId: { in: jobIds }, status: { notIn: [...TERMINAL_APP_STATUSES] } },
      data: { status: 'JobClosed' },
    }),
    prisma.job.updateMany({
      where: { id: { in: jobIds } },
      data: { status: 'Closed' },
    }),
  ]);
}

/** Close non-terminal applications and mark jobs Closed when visibility expires. */
export async function closeExpiredJobs(jobIds: string[]): Promise<{ jobsClosed: number }> {
  if (jobIds.length === 0) return { jobsClosed: 0 };

  const [, updatedJobs] = await prisma.$transaction([
    prisma.application.updateMany({
      where: {
        jobId: { in: jobIds },
        status: { notIn: [...TERMINAL_APP_STATUSES] },
      },
      data: { status: 'JobClosed' },
    }),
    prisma.job.updateMany({
      where: { id: { in: jobIds } },
      data: { status: 'Closed' },
    }),
  ]);

  return { jobsClosed: updatedJobs.count };
}

/** Suspend all recruiters and close active jobs/applications — shared by hospital + subscription suspend. */
export async function suspendHospitalRecruitersAndCloseJobs(hospitalId: string): Promise<void> {
  await prisma.user.updateMany({
    where: { hospitalId, role: 'RECRUITER' },
    data: { isSuspended: true },
  });
  await closeAllActiveJobsForHospital(hospitalId);
}

/** Close active jobs with closedReason: 'plan_expired', DOES NOT touch existing applications. */
export async function closePlanExpiredActiveJobs(hospitalId: string): Promise<void> {
  await prisma.job.updateMany({
    where: { hospitalId, status: 'Active' },
    data: { status: 'Closed', closedReason: 'plan_expired' },
  });
}
