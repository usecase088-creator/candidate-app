-- Add pendingPlanPaymentRef to Hospital model
-- Tracks the Razorpay payment_id for pre-paid scheduled upgrades.
-- When set, the nightly cron knows payment was already collected and applies the upgrade at renewal.
ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "pendingPlanPaymentRef" TEXT;
