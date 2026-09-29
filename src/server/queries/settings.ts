import "server-only";

import { unstable_cache } from "next/cache";

import { DEFAULT_CERTIFICATE_CRITERIA } from "@/lib/domain/certificates";
import { DEFAULT_EARLY_BIRD_LIMIT } from "@/lib/domain/pricing";
import type { PlatformSettings } from "@/lib/domain/types";
import { COL, SETTINGS_DOC, col, serialize } from "../db";
import { isAdminConfigured } from "../firebase-admin";

export const DEFAULT_SETTINGS: PlatformSettings = {
  applicationsOpen: true,
  earlyBird: { enabled: true, limit: DEFAULT_EARLY_BIRD_LIMIT, claimed: 0, showRemaining: false },
  payment: {
    instructions:
      "Sainam Technology will share the payment details with you directly after your application is approved. " +
      "Once you have paid, submit your transaction reference here so our team can verify it manually. " +
      "Never share card numbers, CVV, OTPs or banking passwords with anyone.",
    // Shipped in public/ so it works before an admin uploads one; replace or remove it in Admin → Settings.
    qrCodes: {
      REGULAR: {
        name: "regular-1799.png",
        path: "/payment-qr/regular-1799.png",
        url: "/payment-qr/regular-1799.png",
        size: 9112,
        contentType: "image/png",
        amount: 1799,
      },
    },
  },
  contact: {},
  certificate: { ...DEFAULT_CERTIFICATE_CRITERIA },
  ai: { enabled: true, dailyLimit: 40 },
};

export function mergeSettings(raw: Partial<PlatformSettings> | null | undefined): PlatformSettings {
  const r = raw ?? {};
  return {
    ...DEFAULT_SETTINGS,
    ...r,
    earlyBird: { ...DEFAULT_SETTINGS.earlyBird, ...r.earlyBird },
    payment: {
      ...DEFAULT_SETTINGS.payment,
      ...r.payment,
      qrCodes: { ...DEFAULT_SETTINGS.payment.qrCodes, ...r.payment?.qrCodes },
    },
    contact: { ...DEFAULT_SETTINGS.contact, ...r.contact },
    certificate: { ...DEFAULT_SETTINGS.certificate, ...r.certificate },
    ai: { ...DEFAULT_SETTINGS.ai, ...r.ai },
  };
}

/** Uncached — use inside transactions/admin screens. */
export async function getSettings(): Promise<PlatformSettings> {
  if (!isAdminConfigured()) return DEFAULT_SETTINGS;
  const snap = await col(COL.settings).doc(SETTINGS_DOC).get();
  return mergeSettings(snap.exists ? serialize<Partial<PlatformSettings>>(snap.data()) : null);
}

/** Cached for public pages; invalidated with the `settings` tag. */
export const getPublicSettings = unstable_cache(
  async () => {
    try {
      return await getSettings();
    } catch (error) {
      console.error("[settings] failed to load", error);
      return DEFAULT_SETTINGS;
    }
  },
  ["platform-settings"],
  { tags: ["settings"], revalidate: 300 },
);
