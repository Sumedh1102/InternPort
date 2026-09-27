import type { PricingTier } from "./enums";
import type { PlatformSettings, ProgramFees } from "./types";

export const DEFAULT_EARLY_BIRD_LIMIT = 20;

export function earlyBirdRemaining(settings: Pick<PlatformSettings, "earlyBird">): number {
  if (!settings.earlyBird.enabled) return 0;
  return Math.max(0, settings.earlyBird.limit - settings.earlyBird.claimed);
}

/**
 * Tier allocation at approval time. "AUTO" grants early-bird pricing while seats remain;
 * an admin can also pin a tier explicitly (e.g. honour a promise made offline).
 */
export function resolvePricingTier(
  requested: "AUTO" | PricingTier,
  settings: Pick<PlatformSettings, "earlyBird">,
): PricingTier {
  if (requested === "REGULAR") return "REGULAR";
  const remaining = earlyBirdRemaining(settings);
  if (requested === "EARLY_BIRD") return remaining > 0 ? "EARLY_BIRD" : "REGULAR";
  return remaining > 0 ? "EARLY_BIRD" : "REGULAR";
}

export function monthlyFee(fees: ProgramFees, tier: PricingTier): number {
  return tier === "EARLY_BIRD" ? fees.earlyBird : fees.regular;
}

export function totalFee(fees: ProgramFees, tier: PricingTier, months: number): number {
  return monthlyFee(fees, tier) * Math.max(1, months);
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}
