"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ADMIN_ROLES } from "@/lib/domain/enums";
import { CERTIFICATE_ID_PATTERN, formatCertificateId } from "@/lib/domain/certificates";
import { docId } from "@/lib/domain/schemas";
import type { ActionResult, Certificate, Enrollment } from "@/lib/domain/types";
import type { SessionUser } from "../auth/session";
import { COL, col, fromSnap, queryDocs, serverNow, toTimestamp } from "../db";
import { adminDb } from "../firebase-admin";
import { eligibilityFor, metricsForEnrollments } from "../metrics";
import { notify } from "../notify";
import { getSettings } from "../queries/settings";
import { ActionError, actor, parse, run } from "./_utils";

async function issueFor(enrollment: Enrollment, session: SessionUser): Promise<string> {
  const enrollmentRef = col(COL.enrollments).doc(enrollment.id);
  for (let attempt = 0; attempt < 5; attempt++) {
    const certificateId = formatCertificateId(randomBytes(8));
    const certRef = col(COL.certificates).doc(certificateId);
    try {
      await adminDb().runTransaction(async (tx) => {
        const fresh = fromSnap<Enrollment>(await tx.get(enrollmentRef));
        if (!fresh) throw new ActionError("Enrollment not found.");
        if (fresh.certificateId) throw new ActionError("A certificate was already issued.");
        const start = fresh.startDate ?? fresh.activatedAt ?? fresh.createdAt;
        const end = fresh.endDate ?? new Date().toISOString();
        tx.create(certRef, {
          certificateId,
          studentId: fresh.uid,
          studentName: fresh.studentName,
          programId: fresh.programId,
          programName: fresh.programName,
          batchName: fresh.batchName ?? null,
          enrollmentId: fresh.id,
          startDate: toTimestamp(start),
          endDate: toTimestamp(end),
          issuedAt: serverNow(),
          verificationToken: randomBytes(16).toString("hex"),
          status: "VALID",
          issuedBy: session.uid,
        });
        tx.update(enrollmentRef, {
          certificateId,
          status: "COMPLETED",
          completedAt: fresh.completedAt ? toTimestamp(fresh.completedAt) : serverNow(),
          updatedAt: serverNow(),
        });
      });
      await notify([enrollment.uid], {
        type: "CERTIFICATE_ISSUED",
        title: "Your certificate is ready 🏆",
        body: `Congratulations on completing ${enrollment.programName}! Download and share your verified certificate.`,
        link: "/dashboard/certificates",
      });
      return certificateId;
    } catch (error) {
      // ALREADY_EXISTS (code 6) → regenerate the id and retry.
      if ((error as { code?: number }).code === 6) continue;
      throw error;
    }
  }
  throw new ActionError("Could not generate a unique certificate id. Try again.");
}

const issueSchema = z.object({ enrollmentId: docId, override: z.boolean().optional() });

export async function issueCertificate(input: unknown): Promise<ActionResult<{ certificateId: string }>> {
  return run(async () => {
    const session = await actor(ADMIN_ROLES);
    const data = parse(issueSchema, input);
    const enrollment = fromSnap<Enrollment>(await col(COL.enrollments).doc(data.enrollmentId).get());
    if (!enrollment) throw new ActionError("Enrollment not found.");
    if (enrollment.payment.status !== "PAYMENT_CONFIRMED") {
      throw new ActionError("Payment must be confirmed before a certificate can be issued.");
    }
    if (enrollment.status !== "ACTIVE" && enrollment.status !== "COMPLETED") {
      throw new ActionError("Only active or completed enrollments can receive certificates.");
    }
    const settings = await getSettings();
    const metrics = (await metricsForEnrollments([enrollment])).get(enrollment.id)!;
    const eligibility = eligibilityFor(enrollment, metrics, settings.certificate);
    if (!eligibility.eligible && !data.override) {
      const failed = eligibility.checks.filter((c) => !c.pass).map((c) => c.label);
      throw new ActionError(`Not eligible yet: ${failed.join(", ")}.`);
    }
    const certificateId = await issueFor(enrollment, session);
    revalidatePath("/admin/certificates");
    revalidatePath("/dashboard", "layout");
    return { certificateId };
  }, "Certificate issued");
}

export async function issueAllEligible(): Promise<ActionResult<{ issued: number }>> {
  return run(async () => {
    const session = await actor(ADMIN_ROLES);
    const settings = await getSettings();
    const enrollments = (await queryDocs<Enrollment>(col(COL.enrollments))).filter(
      (e) => (e.status === "ACTIVE" || e.status === "COMPLETED") && !e.certificateId,
    );
    const metrics = await metricsForEnrollments(enrollments);
    let issued = 0;
    for (const e of enrollments) {
      const m = metrics.get(e.id);
      if (m && eligibilityFor(e, m, settings.certificate).eligible) {
        await issueFor(e, session);
        issued += 1;
      }
    }
    revalidatePath("/admin/certificates");
    return { issued };
  }, "Eligible certificates issued");
}

const revokeSchema = z.object({
  certificateId: z.string().regex(CERTIFICATE_ID_PATTERN, "Invalid certificate id"),
  reason: z.string().trim().min(3).max(500),
});

export async function revokeCertificate(input: unknown): Promise<ActionResult> {
  return run(async () => {
    await actor(ADMIN_ROLES);
    const data = parse(revokeSchema, input);
    const ref = col(COL.certificates).doc(data.certificateId);
    const cert = fromSnap<Certificate>(await ref.get());
    if (!cert) throw new ActionError("Certificate not found.");
    await ref.update({
      status: "REVOKED",
      revokedReason: data.reason,
      revokedAt: serverNow(),
    });
    revalidatePath("/admin/certificates");
    revalidatePath(`/verify/${data.certificateId}`);
  }, "Certificate revoked");
}
