/**
 * plans.ts
 * Single source of truth for subscription plan tiers, limits, and pricing.
 */

export type PlanTier = 'Basic' | 'Pro' | 'Premium' | 'Unlimited';

export type PlanConfig = {
  id: PlanTier;
  displayName: string;
  validityDays: number;
  activeJobLimit: number;
  recruiterAccountLimit: number;
  premiumSearchLimit: number;
  priceInRupees: number;
  isLaunchOffer: boolean;
  autoRenewal: boolean;
};

/** Fixed rolling subscription period for planExpiresAt (not calendar-month). */
export const BILLING_CYCLE_DAYS = 30;

export const DEFAULT_PLAN_TIER: PlanTier = 'Basic';

export const PLANS: Record<PlanTier, PlanConfig> = {
  Basic: {
    id: 'Basic',
    displayName: 'Basic',
    validityDays: 18,
    activeJobLimit: 4,
    recruiterAccountLimit: 2,
    premiumSearchLimit: 30,
    priceInRupees: 0,
    isLaunchOffer: true,
    autoRenewal: true,
  },
  Pro: {
    id: 'Pro',
    displayName: 'Pro',
    validityDays: 23,
    activeJobLimit: 8,
    recruiterAccountLimit: 2,
    premiumSearchLimit: 50,
    priceInRupees: 999,
    isLaunchOffer: false,
    autoRenewal: true,
  },
  Premium: {
    id: 'Premium',
    displayName: 'Premium',
    validityDays: 30,
    activeJobLimit: 10,
    recruiterAccountLimit: 5,
    premiumSearchLimit: 100,
    priceInRupees: 1999,
    isLaunchOffer: false,
    autoRenewal: true,
  },
  Unlimited: {
    id: 'Unlimited',
    displayName: 'Unlimited',
    validityDays: 36500,
    activeJobLimit: 999999,
    recruiterAccountLimit: 999999,
    premiumSearchLimit: 999999,
    priceInRupees: 0,
    isLaunchOffer: false,
    autoRenewal: false,
  },
};

export const PLAN_ORDER: PlanTier[] = ['Basic', 'Pro', 'Premium'];

export const PLAN_PRICES: Record<PlanTier, number> = {
  Basic: PLANS.Basic.priceInRupees,
  Pro: PLANS.Pro.priceInRupees,
  Premium: PLANS.Premium.priceInRupees,
  Unlimited: PLANS.Unlimited.priceInRupees,
};

export function isValidPlan(plan: string): plan is PlanTier {
  return plan in PLANS;
}

export function getPlan(plan: string): PlanConfig {
  if (isValidPlan(plan)) return PLANS[plan];
  return PLANS[DEFAULT_PLAN_TIER];
}

export function getRecruiterLimit(plan: string): number {
  return getPlan(plan).recruiterAccountLimit;
}

export function getJobLimit(plan: string): number {
  return getPlan(plan).activeJobLimit;
}

export function getSearchLimit(plan: string): number {
  return getPlan(plan).premiumSearchLimit;
}

export function getPlanPrice(plan: string): number {
  return getPlan(plan).priceInRupees;
}

export function computeVisibilityEndsAt(plan: string): Date {
  const end = new Date();
  end.setDate(end.getDate() + getPlan(plan).validityDays);
  return end;
}
