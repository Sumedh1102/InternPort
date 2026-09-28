"use server";

import { revalidatePath } from "next/cache";

import { ADMIN_ROLES } from "@/lib/domain/enums";
import { monthlyFee, resolvePricingTier, totalFee } from "@/lib/domain/pricing";
import {
  applicationNoteSchema,
  applicationSchema,
  applicationStatusSchema,
  approveApplicationSchema,
  assignApplicationSchema,
  rejectApplicationSchema,
} from "@/lib/domain/schemas";
import type {
  ActionResult,
  Application,
  Batch,
  Enrollment,
  PlatformSettings,
  Program,
  UserProfile,
} from "@/lib/domain/types";
import { APPLICATION_FLOW, assertTransition } from "@/lib/domain/workflows";
import { COL, FieldValue, SETTINGS_DOC, Timestamp, col, fromSnap, queryDocs, serverNow } from "../db";
import { adminDb } from "../firebase-admin";
import { notify } from "../notify";
import { mergeSettings } from "../queries/settings";
import { clientIp, rateLimit } from "../security";
import { UPLOAD_POLICIES, verifyUploadedFile } from "../storage";
import { ActionError, actor, parse, run } from "./_utils";

function revalidateApplicationViews(applicationId?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/applications");
  if (applicationId) revalidatePath(`/admin/applications/${applicationId}`);
  revalidatePath("/dashboard");
}

/* ------------------------------------------------------------------ */
/* Student                                                             */
/* ------------------------------------------------------------------ */

export async function submitApplication(input: unknown): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const session = await actor(["STUDENT"]);
    if (!rateLimit(`apply:${session.uid}:${await clientIp()}`, 5, 60 * 60 * 1000)) {
      throw new ActionError("Too many attempts. Please try again later.");
    }
    const data = parse(applicationSchema, input);
    if (data.website) throw new ActionError("Submission rejected.");

    const settingsSnap = await col(COL.settings).doc(SETTINGS_DOC).get();
    const settings = mergeSettings(settingsSnap.data() as Partial<PlatformSettings> | undefined);
    if (!settings.applicationsOpen) throw new ActionError("Applications are currently closed.");

    const program = fromSnap<Program>(await col(COL.programs).doc(data.programId).get());
    if (!program || program.status !== "PUBLISHED") {
      throw new ActionError("This program is not accepting applications right now.");
    }

    const existing = await queryDocs<Application>(
      col(COL.applications).where("uid", "==", session.uid),
    );
    if (existing.some((a) => a.programId === program.id && a.status !== "REJECTED")) {
      throw new ActionError("You already have an application for this program.");
    }

    const resume = data.resumePath
      ? await verifyUploadedFile(data.resumePath, `resumes/${session.uid}/`, UPLOAD_POLICIES.resume)
      : null;

    const ref = col(COL.applications).doc();
    await ref.set({
      uid: session.uid,
      fullName: data.fullName,
      // The account email is authoritative; the form value is only a contact preference.
      email: session.email,
      contactEmail: data.email,
      phone: data.phone,
      college: data.college,
      degree: data.degree,
      branch: data.branch,
      academicYear: data.academicYear,
      location: data.location,
      programId: program.id,
      programSlug: program.slug,
      programName: program.name,
      technicalSkills: data.technicalSkills,
      skillLevel: data.skillLevel,
      experience: data.experience || null,
      github: data.github || null,
      linkedin: data.linkedin || null,
      portfolio: data.portfolio || null,
      resumeUrl: resume?.url ?? null,
      resumePath: resume?.path ?? null,
      preferredMode: data.preferredMode,
      availability: data.availability,
      hoursPerWeek: data.hoursPerWeek,
      motivation: data.motivation,
      earlyBirdInterest: data.earlyBirdInterest,
      consent: true,
      consentAt: serverNow(),
      status: "PENDING",
      notes: [],
      createdAt: serverNow(),
      updatedAt: serverNow(),
    });

    // Fill empty profile fields from the application (never overwrite what the student set).
    const userRef = col(COL.users).doc(session.uid);
    const user = fromSnap<UserProfile>(await userRef.get());
    const patch: Record<string, unknown> = {};
    const fill = (key: keyof UserProfile, value: unknown) => {
      if (value && !user?.[key]) patch[key] = value;
    };
    fill("phone", data.phone);
    fill("college", data.college);
    fill("degree", data.degree);
    fill("branch", data.branch);
    fill("year", data.academicYear);
    fill("location", data.location);
    fill("github", data.github);
    fill("linkedin", data.linkedin);
    fill("portfolio", data.portfolio);
    if (!user?.skills?.length) patch.skills = data.technicalSkills;
    if (resume && !user?.resumePath) {
      patch.resumePath = resume.path;
      patch.resumeUrl = resume.url;
    }
    if (Object.keys(patch).length) await userRef.set({ ...patch, updatedAt: serverNow() }, { merge: true });

    await notify([session.uid], {
      type: "APPLICATION_RECEIVED",
      title: "Application received",
      body: `Thanks for applying to ${program.name}. Our team will review it and update you here.`,
      link: "/dashboard",
    });
    revalidateApplicationViews();
    return { id: ref.id };
  }, "Application submitted!");
}

/* ------------------------------------------------------------------ */
/* Admin                                                               */
/* ------------------------------------------------------------------ */

function noteEntry(text: string, session: { uid: string; name: string }) {
  return { text, by: session.uid, byName: session.name, at: Timestamp.now() };
}

export async function setApplicationStatus(input: unknown): Promise<ActionResult> {
  return run(async () => {
    const session = await actor(ADMIN_ROLES);
    const data = parse(applicationStatusSchema, input);
    if (data.status === "APPROVED" || data.status === "ENROLLED" || data.status === "REJECTED") {
      throw new ActionError("Use the Approve, Reject or Activate actions for that status.");
    }
    const ref = col(COL.applications).doc(data.applicationId);
    await adminDb().runTransaction(async (tx) => {
      const app = fromSnap<Application>(await tx.get(ref));
      if (!app) throw new ActionError("Application not found.");
      assertTransition("application", APPLICATION_FLOW, app.status, data.status);
      tx.update(ref, {
        status: data.status,
        updatedAt: serverNow(),
        ...(data.note ? { notes: FieldValue.arrayUnion(noteEntry(data.note, session)) } : {}),
      });
    });
    revalidateApplicationViews(data.applicationId);
  }, "Status updated");
}

export async function approveApplication(input: unknown): Promise<ActionResult<{ enrollmentId: string }>> {
  return run(async () => {
    const session = await actor(ADMIN_ROLES);
    const data = parse(approveApplicationSchema, input);
    const db = adminDb();
    const appRef = col(COL.applications).doc(data.applicationId);
    const settingsRef = col(COL.settings).doc(SETTINGS_DOC);
    const enrollmentRef = col(COL.enrollments).doc();

    const result = await db.runTransaction(async (tx) => {
      const [appSnap, settingsSnap] = await Promise.all([tx.get(appRef), tx.get(settingsRef)]);
      const app = fromSnap<Application>(appSnap);
      if (!app) throw new ActionError("Application not found.");
      assertTransition("application", APPLICATION_FLOW, app.status, "APPROVED");
      if (app.enrollmentId) throw new ActionError("This application already has an enrollment.");

      const program = fromSnap<Program>(await tx.get(col(COL.programs).doc(app.programId)));
      if (!program) throw new ActionError("The program for this application no longer exists.");

      const batchId = data.batchId || app.assignedBatchId || "";
      const batch = batchId ? fromSnap<Batch>(await tx.get(col(COL.batches).doc(batchId))) : null;
      if (batchId && (!batch || batch.programId !== program.id)) {
        throw new ActionError("Choose a batch that belongs to this program.");
      }
      const mentorId = data.mentorId || app.assignedMentorId || "";
      const mentor = mentorId ? fromSnap<UserProfile>(await tx.get(col(COL.users).doc(mentorId))) : null;
      if (mentorId && mentor?.role !== "MENTOR") throw new ActionError("Choose a valid mentor.");

      const settings = mergeSettings(settingsSnap.data() as Partial<PlatformSettings> | undefined);
      const tier = resolvePricingTier(data.pricingTier, settings);
      const months = program.durationMonths || 3;

      const enrollment = {
        uid: app.uid,
        studentName: app.fullName,
        studentEmail: app.email,
        applicationId: app.id,
        programId: program.id,
        programName: program.name,
        programSlug: program.slug,
        batchId: batch?.id,
        batchName: batch?.name,
        mentorId: mentor?.id,
        mentorName: mentor?.name,
        status: "AWAITING_PAYMENT",
        payment: {
          provider: "MANUAL",
          status: "PAYMENT_PENDING",
          pricingTier: tier,
          monthlyFee: monthlyFee(program.fees, tier),
          months,
          totalAmount: totalFee(program.fees, tier, months),
          currency: "INR",
          history: [
            {
              status: "PAYMENT_PENDING",
              note: "Application approved — awaiting payment",
              by: session.uid,
              byName: session.name,
              at: Timestamp.now(),
            },
          ],
        },
        completedLessonIds: [],
        progress: { lessonsCompleted: 0, lessonsTotal: 0, lessonPercent: 0 },
      };

      tx.set(enrollmentRef, { ...enrollment, createdAt: serverNow(), updatedAt: serverNow() });
      tx.update(appRef, {
        status: "APPROVED",
        pricingTier: tier,
        enrollmentId: enrollmentRef.id,
        assignedBatchId: batch?.id ?? null,
        assignedMentorId: mentor?.id ?? null,
        reviewedBy: session.uid,
        reviewedAt: serverNow(),
        updatedAt: serverNow(),
        ...(data.note ? { notes: FieldValue.arrayUnion(noteEntry(data.note, session)) } : {}),
      });
      if (tier === "EARLY_BIRD") {
        tx.set(settingsRef, { earlyBird: { claimed: FieldValue.increment(1) } }, { merge: true });
      }
      return { uid: app.uid, programName: program.name, tier };
    });

    await notify([result.uid], {
      type: "APPLICATION_APPROVED",
      title: "Your application is approved 🎉",
      body: `Welcome to ${result.programName}! Open your dashboard for payment instructions to activate your enrollment.`,
      link: "/dashboard/payment",
    });
    revalidateApplicationViews(data.applicationId);
    revalidatePath("/admin/students");
    revalidatePath("/internships", "layout");
    return { enrollmentId: enrollmentRef.id };
  }, "Application approved — enrollment created and awaiting payment");
}

export async function rejectApplication(input: unknown): Promise<ActionResult> {
  return run(async () => {
    const session = await actor(ADMIN_ROLES);
    const data = parse(rejectApplicationSchema, input);
    const ref = col(COL.applications).doc(data.applicationId);
    const app = await adminDb().runTransaction(async (tx) => {
      const current = fromSnap<Application>(await tx.get(ref));
      if (!current) throw new ActionError("Application not found.");
      assertTransition("application", APPLICATION_FLOW, current.status, "REJECTED");
      if (current.enrollmentId) {
        const enrollment = fromSnap<Enrollment>(
          await tx.get(col(COL.enrollments).doc(current.enrollmentId)),
        );
        if (enrollment && enrollment.status !== "AWAITING_PAYMENT" && enrollment.status !== "CANCELLED") {
          throw new ActionError("This student is already enrolled. Manage the enrollment instead.");
        }
        if (enrollment && enrollment.status === "AWAITING_PAYMENT") {
          tx.update(col(COL.enrollments).doc(enrollment.id), {
            status: "CANCELLED",
            updatedAt: serverNow(),
          });
          if (enrollment.payment.pricingTier === "EARLY_BIRD") {
            tx.set(
              col(COL.settings).doc(SETTINGS_DOC),
              { earlyBird: { claimed: FieldValue.increment(-1) } },
              { merge: true },
            );
          }
        }
      }
      tx.update(ref, {
        status: "REJECTED",
        rejectionReason: data.reason,
        enrollmentId: null,
        reviewedBy: session.uid,
        reviewedAt: serverNow(),
        updatedAt: serverNow(),
        notes: FieldValue.arrayUnion(noteEntry(`Rejected: ${data.reason}`, session)),
      });
      return current;
    });
    await notify([app.uid], {
      type: "APPLICATION_REJECTED",
      title: "Update on your application",
      body: `Your application for ${app.programName} was not approved this time. Reason: ${data.reason}`,
      link: "/dashboard",
    });
    revalidateApplicationViews(data.applicationId);
  }, "Application rejected");
}

export async function addApplicationNote(input: unknown): Promise<ActionResult> {
  return run(async () => {
    const session = await actor(ADMIN_ROLES);
    const data = parse(applicationNoteSchema, input);
    const ref = col(COL.applications).doc(data.applicationId);
    if (!(await ref.get()).exists) throw new ActionError("Application not found.");
    await ref.update({
      notes: FieldValue.arrayUnion(noteEntry(data.text, session)),
      updatedAt: serverNow(),
    });
    revalidatePath(`/admin/applications/${data.applicationId}`);
  }, "Note added");
}

export async function assignApplication(input: unknown): Promise<ActionResult> {
  return run(async () => {
    await actor(ADMIN_ROLES);
    const data = parse(assignApplicationSchema, input);
    const ref = col(COL.applications).doc(data.applicationId);
    await adminDb().runTransaction(async (tx) => {
      const app = fromSnap<Application>(await tx.get(ref));
      if (!app) throw new ActionError("Application not found.");
      const enrollment = app.enrollmentId
        ? fromSnap<Enrollment>(await tx.get(col(COL.enrollments).doc(app.enrollmentId)))
        : null;

      let programId = app.programId;
      const patch: Record<string, unknown> = { updatedAt: serverNow() };
      if (data.programId && data.programId !== app.programId) {
        if (enrollment) throw new ActionError("The program can't change after approval.");
        const program = fromSnap<Program>(await tx.get(col(COL.programs).doc(data.programId)));
        if (!program) throw new ActionError("Program not found.");
        programId = program.id;
        Object.assign(patch, {
          programId: program.id,
          programSlug: program.slug,
          programName: program.name,
          assignedBatchId: null,
        });
      }
      const batch = data.batchId
        ? fromSnap<Batch>(await tx.get(col(COL.batches).doc(data.batchId)))
        : null;
      if (data.batchId) {
        if (!batch || batch.programId !== programId) throw new ActionError("Choose a batch in this program.");
        patch.assignedBatchId = batch.id;
      }
      const mentor = data.mentorId
        ? fromSnap<UserProfile>(await tx.get(col(COL.users).doc(data.mentorId)))
        : null;
      if (data.mentorId) {
        if (mentor?.role !== "MENTOR") throw new ActionError("Choose a valid mentor.");
        patch.assignedMentorId = mentor.id;
      }
      tx.update(ref, patch);
      if (enrollment && enrollment.status === "AWAITING_PAYMENT") {
        tx.update(col(COL.enrollments).doc(enrollment.id), {
          ...(batch ? { batchId: batch.id, batchName: batch.name } : {}),
          ...(mentor ? { mentorId: mentor.id, mentorName: mentor.name } : {}),
          updatedAt: serverNow(),
        });
      }
    });
    revalidateApplicationViews(data.applicationId);
  }, "Assignment saved");
}
