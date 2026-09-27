"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { contactSchema, docId, onboardingSchema, profileSchema, supportSchema } from "@/lib/domain/schemas";
import type { ActionResult } from "@/lib/domain/types";
import { COL, col, serverNow } from "../db";
import { adminAuth, adminDb } from "../firebase-admin";
import { clientIp, rateLimit } from "../security";
import { UPLOAD_POLICIES, verifyUploadedFile } from "../storage";
import { ActionError, actor, parse, run } from "./_utils";
import { getSession } from "../auth/session";

/* ------------------------------ Profile ------------------------------ */

async function profilePatch(uid: string, data: z.infer<typeof profileSchema>) {
  const patch: Record<string, unknown> = {
    name: data.name,
    phone: data.phone || null,
    college: data.college || null,
    degree: data.degree || null,
    branch: data.branch || null,
    year: data.year || null,
    location: data.location || null,
    bio: data.bio || null,
    skills: data.skills ?? [],
    github: data.github || null,
    linkedin: data.linkedin || null,
    portfolio: data.portfolio || null,
    updatedAt: serverNow(),
  };
  if (data.profileImagePath) {
    const file = await verifyUploadedFile(
      data.profileImagePath,
      `users/${uid}/profile/`,
      UPLOAD_POLICIES.profileImage,
    );
    patch.profileImage = file.url;
    patch.profileImagePath = file.path;
  }
  if (data.resumePath) {
    const file = await verifyUploadedFile(data.resumePath, `users/${uid}/resume/`, UPLOAD_POLICIES.resume);
    patch.resumeUrl = file.url;
    patch.resumePath = file.path;
  }
  return patch;
}

export async function updateProfile(input: unknown): Promise<ActionResult> {
  return run(async () => {
    const session = await actor();
    const data = parse(profileSchema, input);
    const patch = await profilePatch(session.uid, data);
    await col(COL.users).doc(session.uid).set(patch, { merge: true });
    await adminAuth().updateUser(session.uid, { displayName: data.name });
    revalidatePath("/dashboard", "layout");
    revalidatePath("/mentor", "layout");
    revalidatePath("/admin", "layout");
  }, "Profile saved");
}

export async function completeOnboarding(input: unknown): Promise<ActionResult> {
  return run(async () => {
    const session = await actor();
    const data = parse(onboardingSchema, input);
    const patch = await profilePatch(session.uid, data);
    await col(COL.users).doc(session.uid).set({ ...patch, onboarded: true }, { merge: true });
    await adminAuth().updateUser(session.uid, { displayName: data.name });
    revalidatePath("/dashboard", "layout");
  }, "Welcome aboard!");
}

/* --------------------------- Notifications --------------------------- */

export async function markNotificationRead(notificationId: string): Promise<ActionResult> {
  return run(async () => {
    const session = await actor();
    const ref = col(COL.notifications).doc(parse(docId, notificationId));
    const snap = await ref.get();
    if (!snap.exists || snap.get("uid") !== session.uid) throw new ActionError("Notification not found.");
    await ref.update({ read: true });
    revalidatePath("/dashboard", "layout");
    revalidatePath("/mentor", "layout");
  });
}

export async function markAllNotificationsRead(): Promise<ActionResult<{ count: number }>> {
  return run(async () => {
    const session = await actor();
    const unread = await col(COL.notifications)
      .where("uid", "==", session.uid)
      .where("read", "==", false)
      .get();
    const writer = adminDb().bulkWriter();
    unread.docs.forEach((d) => writer.update(d.ref, { read: true }));
    await writer.close();
    revalidatePath("/dashboard", "layout");
    revalidatePath("/mentor", "layout");
    revalidatePath("/admin", "layout");
    return { count: unread.size };
  }, "All caught up");
}

/* ------------------------- Contact & support ------------------------- */

export async function submitContact(input: unknown): Promise<ActionResult> {
  return run(async () => {
    const data = parse(contactSchema, input);
    if (data.website) return; // honeypot: pretend success for bots
    if (!rateLimit(`contact:${await clientIp()}`, 5, 60 * 60 * 1000)) {
      throw new ActionError("Too many messages. Please try again later.");
    }
    const session = await getSession();
    await col(COL.contactMessages).add({
      name: data.name,
      email: data.email.toLowerCase(),
      phone: data.phone || null,
      subject: data.subject,
      message: data.message,
      kind: "CONTACT",
      uid: session?.uid ?? null,
      handled: false,
      createdAt: serverNow(),
    });
  }, "Message sent — we'll get back to you soon.");
}

export async function submitSupport(input: unknown): Promise<ActionResult> {
  return run(async () => {
    const session = await actor();
    const data = parse(supportSchema, input);
    if (!rateLimit(`support:${session.uid}`, 10, 60 * 60 * 1000)) {
      throw new ActionError("Too many requests. Please try again later.");
    }
    await col(COL.contactMessages).add({
      name: session.name,
      email: session.email,
      subject: data.subject,
      message: data.message,
      kind: "SUPPORT",
      uid: session.uid,
      handled: false,
      createdAt: serverNow(),
    });
  }, "Support request sent. The team will reply by email.");
}
