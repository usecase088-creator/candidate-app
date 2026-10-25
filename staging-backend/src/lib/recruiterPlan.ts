import prisma from './prisma';
import { User } from '@prisma/client';

export type RecruiterActivationPlan = {
  toActivate: User[];         // currently plan-suspended, will become active
  toSuspend: User[];          // currently active, will become plan-suspended
  remainingActive: User[];
  remainingSuspended: User[];
};

/**
 * Pure-ish read function to compute which recruiters should be active vs suspended
 * based on a new limit. It applies oldest-first precedence.
 * 
 * @param hospitalId The ID of the hospital
 * @param newLimit The new maximum number of recruiters
 */
export async function computeRecruiterActivationPlan(
  hospitalId: string,
  newLimit: number,
): Promise<RecruiterActivationPlan> {
  // Get all non-deleted recruiters for the hospital, ordered oldest first
  const recruiters = await prisma.user.findMany({
    where: { 
      hospitalId, 
      role: 'RECRUITER', 
      deletedAt: null 
    },
    orderBy: [
      { createdAt: 'asc' },
      { id: 'asc' } // tie-breaker for deterministic ordering
    ]
  });

  const activeAllowed = recruiters.slice(0, newLimit);
  const shouldBeSuspended = recruiters.slice(newLimit);

  const toActivate: User[] = [];
  const remainingActive: User[] = [];
  
  for (const r of activeAllowed) {
    if (r.planSuspendedAt) {
      toActivate.push(r);
    } else {
      remainingActive.push(r);
    }
  }

  const toSuspend: User[] = [];
  const remainingSuspended: User[] = [];

  for (const r of shouldBeSuspended) {
    if (!r.planSuspendedAt) {
      toSuspend.push(r);
    } else {
      remainingSuspended.push(r);
    }
  }

  return {
    toActivate,
    toSuspend,
    remainingActive,
    remainingSuspended
  };
}

/**
 * Executes the plan computed by `computeRecruiterActivationPlan` using a Prisma transaction.
 * Optional `reason` is used for `planSuspendedReason`.
 */
export async function applyRecruiterActivationPlan(
  plan: RecruiterActivationPlan,
  reason: string,
): Promise<void> {
  const activateIds = plan.toActivate.map(u => u.id);
  const suspendIds = plan.toSuspend.map(u => u.id);

  const ops: any[] = [];

  if (activateIds.length > 0) {
    ops.push(
      prisma.user.updateMany({
        where: { id: { in: activateIds } },
        data: {
          planSuspendedAt: null,
          planSuspendedReason: null,
        }
      })
    );
  }

  if (suspendIds.length > 0) {
    ops.push(
      prisma.user.updateMany({
        where: { id: { in: suspendIds } },
        data: {
          planSuspendedAt: new Date(),
          planSuspendedReason: reason,
        }
      })
    );
  }

  if (ops.length > 0) {
    await prisma.$transaction(ops);
  }
}
