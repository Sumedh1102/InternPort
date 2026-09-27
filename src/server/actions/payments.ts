"use server";

import { revalidatePath } from "next/cache";
import type { Transaction } from "firebase-admin/firestore";

import { ADMIN_ROLES, type PaymentStatus } from "@/lib/domain/enums";
import {
  enrollmentUpdateSchema,
  looksLikeCardNumber,
  paymentReportSchema,
  paymentUpdateSchema,
} from "@/lib/domain/schemas";
import type { ActionResult, Application, Batch, Enrollment, UserProfile } from "@/lib/domain/types";
import {
  APPLICATION_FLOW,
  ENROLLMENT_FLOW,
  PAYMENT_FLOW,
  STUDENT_PAYMENT_FLOW,
  assertTransition,
} from "@/lib/domain/workflows";
import type { SessionUser } from "../auth/session";
import { COL, FieldValue, SETTINGS_DOC, Timestamp, col, fromSnap, serverNow, toTimestamp } from "../db";
import { adminDb } from "../firebase-admin";
import { notify, type NotificationInput } from "../notify";
import { paymentProvider } from "../payments/provider";
import { ActionError, actor, parse, run } from "./_utils";

const CARD_WARNING =
  "That looks like a card number. Please enter only the transaction / UTR reference — never card details.";

function history(status: PaymentStatus, note: string | undefined, session: SessionUser) {
  return { status, note: note ?? null, by: session.uid, byName: session.name, at: Timestamp.now() };
}

function revalidatePaymentViews() {
  revalidatePath("/admin");
  revalidatePath("/admin/students");
  revalidatePath("/admin/applications");
  revalidatePath("/dashboard", "layout");
}

/* ------------------------------------------------------------------ */
/* Student: report an offline payment for manual verification          */
/* ------------------------------------------------------------------ */

export async function reportPayment(input: unknown): Promise<ActionResult> {
  return run(async () => {
    const session = await actor(["STUDENT"]);
    const data = parse(paymentReportSchema, input);
    if (looksLikeCardNumber(data.reference) || looksLikeCardNumber(data.note ?? "")) {
      throw new ActionError(CARD_WARNING);
    }
    const ref = col(COL.enrollments).doc(data.enrollmentId);
    await adminDb().runTransaction(async (tx) => {
      const enrollment = fromSnap<Enrollment>(await tx.get(ref));
      if (!enrollment || enrollment.uid !== session.uid) throw new ActionError("Enrollment not found.");
      if (enrollment.status !== "AWAITING_PAYMENT") {
        throw new ActionError("This enrollment is not awaiting payment.");
      }
      if (!paymentProvider(enrollment.payment.provider).supportsSelfReport) {
        throw new ActionError("Payments for this enrollment are handled automatically.");
      }
      assertTransition("payment", STUDENT_PAYMENT_FLOW, enrollment.payment.status, "PAYMENT_IN_REVIEW");
      tx.update(ref, {
        "payment.status": "PAYMENT_IN_REVIEW",
        "payment.method": data.method,
        "payment.reference": data.reference,
        "payment.paidOn": toTimestamp(data.paidOn),
        "payment.studentNote": data.note || null,
        "payment.updatedAt": serverNow(),
        "payment.history": FieldValue.arrayUnion(
          history("PAYMENT_IN_REVIEW", `Student reported payment (${data.method})`, session),
        ),
        updatedAt: serverNow(),
      });
    });
    revalidatePaymentViews();
  }, "Thanks! Your payment details were sent for verification.");
}

/* ------------------------------------------------------------------ */
/* Admin: activation (shared by payment confirmation & enrollment mgmt) */
/* ------------------------------------------------------------------ */

interface ActivationContext {
  enrollment: Enrollment;
  application: Application | null;
  batch: Batch;
}

async function readActivation(tx: Transaction, enrollment: Enrollment): Promise<ActivationContext> {
  if (!enrollment.batchId) {
    throw new ActionError("Assign a batch before activating the enrollment.");
  }
  const [batchSnap, appSnap] = await Promise.all([
    tx.get(col(COL.batches).doc(enrollment.batchId)),
    tx.get(col(COL.applications).doc(enrollment.applicationId)),
  ]);
  const batch = fromSnap<Batch>(batchSnap);
  if (!batch) throw new ActionError("The assigned batch no longer exists.");
  return { enrollment, batch, application: fromSnap<Application>(appSnap) };
}

function writeActivation(tx: Transaction, ctx: ActivationContext, paymentConfirmed: boolean) {
  const { enrollment, batch, application } = ctx;
  if (!paymentConfirmed) {
    throw new ActionError("Payment must be confirmed before the enrollment can be activated.");
  }
  assertTransition("enrollment", ENROLLMENT_FLOW, enrollment.status, "ACTIVE");
  const firstActivation = !enrollment.activatedAt;
  tx.update(col(COL.enrollments).doc(enrollment.id), {
    status: "ACTIVE",
    startDate: toTimestamp(batch.startDate),
    endDate: toTimestamp(batch.endDate),
    ...(firstActivation ? { activatedAt: serverNow() } : {}),
    updatedAt: serverNow(),
  });
  if (application && application.status !== "ENROLLED") {
    assertTransition("application", APPLICATION_FLOW, application.status, "ENROLLED");
    tx.update(col(COL.applications).doc(application.id), {
      status: "ENROLLED",
      updatedAt: serverNow(),
    });
  }
  if (firstActivation) {
    tx.update(col(COL.batches).doc(batch.id), { studentCount: FieldValue.increment(1) });
  }
}

/* ------------------------------------------------------------------ */
/* Admin: manual payment status                                        */
/* ------------------------------------------------------------------ */

export async function updatePayment(input: unknown): Promise<ActionResult> {
  return run(async () => {
    const session = await actor(ADMIN_ROLES);
    const data = parse(paymentUpdateSchema, input);
    if (looksLikeCardNumber(data.reference ?? "") || looksLikeCardNumber(data.adminNote ?? "")) {
      throw new ActionError(CARD_WARNING);
    }
    const ref = col(COL.enrollments).doc(data.enrollmentId);
    const outcome = await adminDb().runTransaction(async (tx) => {
      const enrollment = fromSnap<Enrollment>(await tx.get(ref));
      if (!enrollment) throw new ActionError("Enrollment not found.");
      const current = enrollment.payment.status;
      if (!paymentProvider(enrollment.payment.provider).manualStatuses.includes(data.status)) {
        throw new ActionError("This status can't be set manually for this payment provider.");
      }
      assertTransition("payment", PAYMENT_FLOW, current, data.status);
      if (
        current === "PAYMENT_CONFIRMED" &&
        data.status !== "PAYMENT_CONFIRMED" &&
        enrollment.status === "ACTIVE"
      ) {
        throw new ActionError("Suspend the enrollment before reverting a confirmed payment.");
      }
      const activate = data.activate && data.status === "PAYMENT_CONFIRMED";
      const ctx = activate ? await readActivation(tx, enrollment) : null;

      const confirming = data.status === "PAYMENT_CONFIRMED" && current !== "PAYMENT_CONFIRMED";
      tx.update(ref, {
        "payment.status": data.status,
        ...(data.method ? { "payment.method": data.method } : {}),
        ...(data.reference ? { "payment.reference": data.reference } : {}),
        ...(data.paidOn ? { "payment.paidOn": toTimestamp(data.paidOn) } : {}),
        ...(typeof data.totalAmount === "number" ? { "payment.totalAmount": data.totalAmount } : {}),
        ...(data.adminNote ? { "payment.adminNote": data.adminNote } : {}),
        ...(confirming ? { "payment.verifiedBy": session.uid, "payment.verifiedAt": serverNow() } : {}),
        "payment.updatedAt": serverNow(),
        "payment.history": FieldValue.arrayUnion(history(data.status, data.adminNote, session)),
        updatedAt: serverNow(),
      });
      if (ctx) writeActivation(tx, ctx, true);
      return { enrollment, activated: Boolean(ctx) };
    });

    const { enrollment, activated } = outcome;
    const messages: Partial<Record<PaymentStatus, NotificationInput>> = {
      PAYMENT_CONFIRMED: {
        type: "PAYMENT_VERIFIED",
        title: "Payment verified",
        body: activated
          ? `Your payment for ${enrollment.programName} is verified and your enrollment is now active.`
          : `Your payment for ${enrollment.programName} is verified. Your enrollment will be activated shortly.`,
        link: "/dashboard",
      },
      PAYMENT_REJECTED: {
        type: "PAYMENT_UPDATE",
        title: "Payment could not be verified",
        body: data.adminNote
          ? `We couldn't verify your payment: ${data.adminNote}`
          : "We couldn't verify your payment. Please check the reference and resubmit, or contact us.",
        link: "/dashboard/payment",
      },
      PAYMENT_IN_REVIEW: {
        type: "PAYMENT_UPDATE",
        title: "Payment under review",
        body: "Our team is verifying your payment.",
        link: "/dashboard/payment",
      },
    };
    const message = messages[data.status];
    if (message && data.status !== enrollment.payment.status) await notify([enrollment.uid], message);
    if (activated) await notifyActivated(enrollment);
    revalidatePaymentViews();
  }, "Payment updated");
}

async function notifyActivated(enrollment: Enrollment) {
  await notify([enrollment.uid], {
    type: "ENROLLMENT_ACTIVATED",
    title: "Enrollment activated 🚀",
    body: `You now have full access to ${enrollment.programName}. Start with your first lesson!`,
    link: "/dashboard/learning",
  });
}

export async function activateEnrollment(enrollmentId: string): Promise<ActionResult> {
  return run(async () => {
    await actor(ADMIN_ROLES);
    const ref = col(COL.enrollments).doc(String(enrollmentId));
    const enrollment = await adminDb().runTransaction(async (tx) => {
      const current = fromSnap<Enrollment>(await tx.get(ref));
      if (!current) throw new ActionError("Enrollment not found.");
      const ctx = await readActivation(tx, current);
      writeActivation(tx, ctx, current.payment.status === "PAYMENT_CONFIRMED");
      return current;
    });
    if (!enrollment.activatedAt) await notifyActivated(enrollment);
    revalidatePaymentViews();
  }, "Enrollment activated");
}

/* ------------------------------------------------------------------ */
/* Admin: enrollment management (status, batch, mentor)                */
/* ------------------------------------------------------------------ */

export async function updateEnrollment(input: unknown): Promise<ActionResult> {
  return run(async () => {
    await actor(ADMIN_ROLES);
    const data = parse(enrollmentUpdateSchema, input);
    const ref = col(COL.enrollments).doc(data.enrollmentId);
    await adminDb().runTransaction(async (tx) => {
      const enrollment = fromSnap<Enrollment>(await tx.get(ref));
      if (!enrollment) throw new ActionError("Enrollment not found.");

      const batch =
        data.batchId && data.batchId !== enrollment.batchId
          ? fromSnap<Batch>(await tx.get(col(COL.batches).doc(data.batchId)))
          : null;
      if (data.batchId && data.batchId !== enrollment.batchId) {
        if (!batch || batch.programId !== enrollment.programId) {
          throw new ActionError("Choose a batch in the student's program.");
        }
      }
      const mentor =
        data.mentorId && data.mentorId !== enrollment.mentorId
          ? fromSnap<UserProfile>(await tx.get(col(COL.users).doc(data.mentorId)))
          : null;
      if (data.mentorId && data.mentorId !== enrollment.mentorId && mentor?.role !== "MENTOR") {
        throw new ActionError("Choose a valid mentor.");
      }

      const patch: Record<string, unknown> = { updatedAt: serverNow() };
      if (batch) {
        Object.assign(patch, { batchId: batch.id, batchName: batch.name });
        if (enrollment.activatedAt && enrollment.batchId) {
          tx.update(col(COL.batches).doc(enrollment.batchId), { studentCount: FieldValue.increment(-1) });
          tx.update(col(COL.batches).doc(batch.id), { studentCount: FieldValue.increment(1) });
        }
      }
      if (mentor) Object.assign(patch, { mentorId: mentor.id, mentorName: mentor.name });

      const next = data.status;
      if (next && next !== enrollment.status) {
        if (next === "ACTIVE" && enrollment.status === "AWAITING_PAYMENT") {
          throw new ActionError("Confirm the payment and use Activate to start this enrollment.");
        }
        assertTransition("enrollment", ENROLLMENT_FLOW, enrollment.status, next);
        patch.status = next;
        if (next === "COMPLETED") patch.completedAt = serverNow();
        if (
          next === "CANCELLED" &&
          enrollment.status === "AWAITING_PAYMENT" &&
          enrollment.payment.pricingTier === "EARLY_BIRD"
        ) {
          tx.set(
            col(COL.settings).doc(SETTINGS_DOC),
            { earlyBird: { claimed: FieldValue.increment(-1) } },
            { merge: true },
          );
        }
      }
      tx.update(ref, patch);
    });
    revalidatePaymentViews();
  }, "Enrollment updated");
}
