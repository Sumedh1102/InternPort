import "server-only";

import type { PaymentProviderId, PaymentStatus } from "@/lib/domain/enums";
import type { Enrollment, PaymentQrCode, PlatformSettings } from "@/lib/domain/types";

/**
 * Payment provider seam.
 *
 * V1 ships only the MANUAL provider: students pay offline and an admin verifies.
 * A future gateway (e.g. a hosted checkout) implements this same interface:
 *  - `instructions()` would return a checkout link instead of text,
 *  - a webhook route would call `applyPaymentStatus` (see actions/payments.ts) with
 *    provider-verified data, reusing the same PAYMENT_* state machine and history.
 * No enrollment/application code needs to change to add one.
 */
export interface PaymentInstructions {
  kind: "manual" | "redirect";
  heading: string;
  body: string;
  payeeName?: string;
  upiId?: string;
  bankDetails?: string;
  supportContact?: string;
  /** QR code for the student's pricing tier. */
  qrCode?: PaymentQrCode;
  checkoutUrl?: string;
}

export interface PaymentProvider {
  id: PaymentProviderId;
  label: string;
  /** Whether the student can self-report a payment for manual verification. */
  supportsSelfReport: boolean;
  instructions(enrollment: Enrollment, settings: PlatformSettings): PaymentInstructions;
  /** Statuses an admin may set by hand for this provider. */
  manualStatuses: readonly PaymentStatus[];
}

export const manualProvider: PaymentProvider = {
  id: "MANUAL",
  label: "Manual verification",
  supportsSelfReport: true,
  manualStatuses: ["PAYMENT_PENDING", "PAYMENT_IN_REVIEW", "PAYMENT_CONFIRMED", "PAYMENT_REJECTED"],
  instructions(enrollment, settings) {
    return {
      kind: "manual",
      heading: "How to complete your payment",
      body: settings.payment.instructions,
      payeeName: settings.payment.payeeName,
      upiId: settings.payment.upiId,
      bankDetails: settings.payment.bankDetails,
      supportContact: settings.payment.supportContact,
      qrCode: settings.payment.qrCodes?.[enrollment.payment.pricingTier] ?? undefined,
    };
  },
};

const PROVIDERS: Record<PaymentProviderId, PaymentProvider> = {
  MANUAL: manualProvider,
};

export function paymentProvider(id: PaymentProviderId | undefined): PaymentProvider {
  return PROVIDERS[id ?? "MANUAL"] ?? manualProvider;
}
