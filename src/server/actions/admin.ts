"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";

import { ADMIN_ROLES, PRICING_TIERS, PROGRAM_STATUSES, type PricingTier, type Role } from "@/lib/domain/enums";
import {
  batchSchema,
  docId,
  programSchema,
  roleChangeSchema,
  settingsSchema,
  teamMemberSchema,
} from "@/lib/domain/schemas";
import type { ActionResult, Batch, PaymentQrCode, Program, UserProfile } from "@/lib/domain/types";
import { canAssignRole } from "@/lib/domain/workflows";
import { COL, SETTINGS_DOC, col, countOf, fromSnap, queryDocs, serverNow, toTimestamp } from "../db";
import { adminAuth, adminDb } from "../firebase-admin";
import { roleFromClaims } from "../auth/session";
import { getSettings } from "../queries/settings";
import { UPLOAD_POLICIES, verifyUploadedFile } from "../storage";
import { ActionError, actor, parse, run } from "./_utils";

function revalidatePrograms(slug?: string) {
  revalidateTag("programs", { expire: 0 });
  revalidatePath("/", "layout");
  revalidatePath("/internships");
  if (slug) revalidatePath(`/internships/${slug}`);
  revalidatePath("/admin/programs");
}

/* ------------------------------ Programs ----------------------------- */

export async function saveProgram(
  programId: string | null,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    await actor(ADMIN_ROLES);
    const data = parse(programSchema, input);
    const id = programId ? parse(docId, programId) : null;

    const clash = await queryDocs<Program>(col(COL.programs).where("slug", "==", data.slug).limit(2));
    if (clash.some((p) => p.id !== id)) throw new ActionError("Another program already uses this slug.");

    const payload = {
      ...data,
      fees: { ...data.fees, currency: "INR", unit: "MONTH" },
      updatedAt: serverNow(),
    };
    let savedId = id;
    if (id) {
      const ref = col(COL.programs).doc(id);
      if (!(await ref.get()).exists) throw new ActionError("Program not found.");
      await ref.update(payload);
    } else {
      const ref = await col(COL.programs).add({ ...payload, createdAt: serverNow() });
      savedId = ref.id;
    }
    revalidatePrograms(data.slug);
    return { id: savedId! };
  }, "Program saved");
}

export async function setProgramStatus(programId: string, status: string): Promise<ActionResult> {
  return run(async () => {
    await actor(ADMIN_ROLES);
    const id = parse(docId, programId);
    const next = parse(z.enum(PROGRAM_STATUSES), status);
    const ref = col(COL.programs).doc(id);
    const program = fromSnap<Program>(await ref.get());
    if (!program) throw new ActionError("Program not found.");
    await ref.update({ status: next, updatedAt: serverNow() });
    revalidatePrograms(program.slug);
  }, "Program status updated");
}

export async function deleteProgram(programId: string): Promise<ActionResult> {
  return run(async () => {
    await actor(ADMIN_ROLES);
    const id = parse(docId, programId);
    const [apps, enrollments] = await Promise.all([
      countOf(col(COL.applications).where("programId", "==", id)),
      countOf(col(COL.enrollments).where("programId", "==", id)),
    ]);
    if (apps + enrollments > 0) {
      throw new ActionError("This program has applications or enrollments. Archive it instead.");
    }
    await col(COL.programs).doc(id).delete();
    revalidatePrograms();
  }, "Program deleted");
}

/* ------------------------------ Batches ------------------------------ */

export async function saveBatch(batchId: string | null, input: unknown): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    await actor(ADMIN_ROLES);
    const data = parse(batchSchema, input);
    const id = batchId ? parse(docId, batchId) : null;
    const program = fromSnap<Program>(await col(COL.programs).doc(data.programId).get());
    if (!program) throw new ActionError("Program not found.");

    if (data.mentorIds.length) {
      const snaps = await adminDb().getAll(...data.mentorIds.map((m) => col(COL.users).doc(m)));
      if (snaps.some((s) => s.get("role") !== "MENTOR")) {
        throw new ActionError("Only users with the Mentor role can be assigned to a batch.");
      }
    }
    const clash = await queryDocs<Batch>(col(COL.batches).where("code", "==", data.code).limit(2));
    if (clash.some((b) => b.id !== id)) throw new ActionError("Batch code already in use.");

    const payload = {
      ...data,
      programName: program.name,
      startDate: toTimestamp(data.startDate),
      endDate: toTimestamp(data.endDate),
      schedule: data.schedule || null,
      updatedAt: serverNow(),
    };
    let savedId = id;
    if (id) {
      const ref = col(COL.batches).doc(id);
      const existing = fromSnap<Batch>(await ref.get());
      if (!existing) throw new ActionError("Batch not found.");
      if (existing.programId !== data.programId && existing.studentCount > 0) {
        throw new ActionError("Students are enrolled in this batch; its program can't change.");
      }
      await ref.update(payload);
      // Keep denormalised batch names in sync on enrollments.
      if (existing.name !== data.name) {
        const enrollments = await col(COL.enrollments).where("batchId", "==", id).get();
        const writer = adminDb().bulkWriter();
        enrollments.docs.forEach((d) => writer.update(d.ref, { batchName: data.name }));
        await writer.close();
      }
    } else {
      const ref = await col(COL.batches).add({ ...payload, studentCount: 0, createdAt: serverNow() });
      savedId = ref.id;
    }
    revalidatePath("/admin/batches");
    return { id: savedId! };
  }, "Batch saved");
}

export async function deleteBatch(batchId: string): Promise<ActionResult> {
  return run(async () => {
    await actor(ADMIN_ROLES);
    const id = parse(docId, batchId);
    const used = await countOf(col(COL.enrollments).where("batchId", "==", id));
    if (used > 0) throw new ActionError("Students are assigned to this batch. Archive it instead.");
    await col(COL.batches).doc(id).delete();
    revalidatePath("/admin/batches");
  }, "Batch deleted");
}

/* --------------------------- Users & roles --------------------------- */

/**
 * Role changes write the Firebase custom claim (source of truth), mirror it on the
 * user document for querying, and revoke refresh tokens so the next request
 * re-authenticates with the new claim.
 */
export async function setUserRole(input: unknown): Promise<ActionResult> {
  return run(async () => {
    const session = await actor(ADMIN_ROLES);
    const data = parse(roleChangeSchema, input);
    const auth = adminAuth();
    let target;
    try {
      target = await auth.getUserByEmail(data.email.toLowerCase());
    } catch {
      throw new ActionError("No account exists with that email. Ask them to register first.");
    }
    if (target.uid === session.uid) throw new ActionError("You can't change your own role.");
    const current = roleFromClaims(target.customClaims ?? {});
    if (!canAssignRole(session.role, data.role as Role, current)) {
      throw new ActionError("Only a super admin can grant or remove admin roles.");
    }
    await auth.setCustomUserClaims(target.uid, { ...(target.customClaims ?? {}), role: data.role });
    await col(COL.users)
      .doc(target.uid)
      .set(
        {
          role: data.role,
          email: target.email?.toLowerCase(),
          name: target.displayName ?? target.email?.split("@")[0],
          onboarded: true,
          updatedAt: serverNow(),
        },
        { merge: true },
      );
    await auth.revokeRefreshTokens(target.uid);
    revalidatePath("/admin/mentors");
    revalidatePath("/admin/students");
    revalidatePath("/admin/settings");
  }, "Role updated. The user will be asked to sign in again.");
}

export async function setUserDisabled(uid: string, disabled: boolean): Promise<ActionResult> {
  return run(async () => {
    const session = await actor(ADMIN_ROLES);
    const id = parse(docId, uid);
    if (id === session.uid) throw new ActionError("You can't disable your own account.");
    const user = fromSnap<UserProfile>(await col(COL.users).doc(id).get());
    if (!user) throw new ActionError("User not found.");
    if (!canAssignRole(session.role, user.role, user.role)) {
      throw new ActionError("Only a super admin can disable admins.");
    }
    await adminAuth().updateUser(id, { disabled: Boolean(disabled) });
    if (disabled) await adminAuth().revokeRefreshTokens(id);
    await col(COL.users).doc(id).update({ disabled: Boolean(disabled), updatedAt: serverNow() });
    revalidatePath("/admin/students");
    revalidatePath("/admin/mentors");
  }, disabled ? "Account disabled" : "Account enabled");
}

/* ------------------------------ Settings ----------------------------- */

const PAYMENT_QR_FOLDER = "internship-documents/settings/payment-qr/";

export async function saveSettings(input: unknown): Promise<ActionResult> {
  return run(async () => {
    await actor(ADMIN_ROLES);
    const data = parse(settingsSchema, input);
    // A saved QR (including the default one in public/) is kept as is; a new upload is re-checked.
    const saved = (await getSettings()).payment.qrCodes ?? {};
    const existing = PRICING_TIERS.flatMap((t) => saved[t] ?? []);
    const qrCodes = {} as Record<PricingTier, PaymentQrCode | null>;
    for (const tier of PRICING_TIERS) {
      const { path, amount } = data.payment.qrCodes[tier];
      const file = path ? await verifyUploadedFile(path, PAYMENT_QR_FOLDER, UPLOAD_POLICIES.paymentQr, existing) : null;
      qrCodes[tier] = file ? { ...file, amount: amount ?? null } : null;
    }
    // `claimed` is only ever changed transactionally by approvals — never from this form.
    await col(COL.settings)
      .doc(SETTINGS_DOC)
      .set(
        {
          applicationsOpen: data.applicationsOpen,
          earlyBird: {
            enabled: data.earlyBird.enabled,
            limit: data.earlyBird.limit,
            showRemaining: data.earlyBird.showRemaining,
          },
          payment: { ...data.payment, qrCodes },
          contact: data.contact,
          certificate: data.certificate,
          ai: data.ai,
          updatedAt: serverNow(),
        },
        { merge: true },
      );
    revalidateTag("settings", { expire: 0 });
    revalidatePath("/", "layout");
  }, "Settings saved");
}

export async function saveTeamMember(memberId: string | null, input: unknown): Promise<ActionResult> {
  return run(async () => {
    await actor(ADMIN_ROLES);
    const data = parse(teamMemberSchema, input);
    const payload = {
      ...data,
      bio: data.bio || null,
      photoUrl: data.photoUrl || null,
      linkedin: data.linkedin || null,
      github: data.github || null,
      updatedAt: serverNow(),
    };
    if (memberId) await col(COL.team).doc(parse(docId, memberId)).set(payload, { merge: true });
    else await col(COL.team).add({ ...payload, createdAt: serverNow() });
    revalidatePath("/team");
    revalidatePath("/admin/settings");
  }, "Team member saved");
}

export async function deleteTeamMember(memberId: string): Promise<ActionResult> {
  return run(async () => {
    await actor(ADMIN_ROLES);
    await col(COL.team).doc(parse(docId, memberId)).delete();
    revalidatePath("/team");
    revalidatePath("/admin/settings");
  }, "Team member removed");
}

export async function setMessageHandled(messageId: string, handled: boolean): Promise<ActionResult> {
  return run(async () => {
    await actor(ADMIN_ROLES);
    await col(COL.contactMessages)
      .doc(parse(docId, messageId))
      .update({ handled: Boolean(handled), updatedAt: serverNow() });
    revalidatePath("/admin/settings");
    revalidatePath("/admin");
  }, handled ? "Marked as handled" : "Marked as open");
}
