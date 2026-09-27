"use server";

import { revalidatePath } from "next/cache";

import { ADMIN_ROLES, STAFF_ROLES } from "@/lib/domain/enums";
import { announcementSchema, docId, resourceSchema } from "@/lib/domain/schemas";
import type { ActionResult, Announcement, Resource } from "@/lib/domain/types";
import { isAdmin } from "@/lib/domain/workflows";
import { assertBatchAccess } from "../access";
import { COL, col, fromSnap, queryDocs, serverNow } from "../db";
import { getUsersByRole } from "../queries/platform";
import { notify } from "../notify";
import { UPLOAD_POLICIES, verifyUploadedFile } from "../storage";
import { ActionError, actor, parse, run } from "./_utils";
import type { Enrollment } from "@/lib/domain/types";

/* ---------------------------- Announcements -------------------------- */

async function audienceUids(a: {
  audience: Announcement["audience"];
  programId?: string | null;
  batchId?: string | null;
}): Promise<string[]> {
  if (a.audience === "MENTORS") return (await getUsersByRole(["MENTOR"])).map((u) => u.id);
  let enrollments: Enrollment[];
  if (a.audience === "BATCH" && a.batchId) {
    enrollments = await queryDocs<Enrollment>(col(COL.enrollments).where("batchId", "==", a.batchId));
  } else if (a.audience === "PROGRAM" && a.programId) {
    enrollments = await queryDocs<Enrollment>(col(COL.enrollments).where("programId", "==", a.programId));
  } else {
    enrollments = await queryDocs<Enrollment>(col(COL.enrollments).where("status", "==", "ACTIVE"));
  }
  return enrollments.filter((e) => e.status === "ACTIVE").map((e) => e.uid);
}

export async function saveAnnouncement(
  announcementId: string | null,
  input: unknown,
): Promise<ActionResult<{ id: string; notified: number }>> {
  return run(async () => {
    const session = await actor(STAFF_ROLES);
    const data = parse(announcementSchema, input);
    if (!isAdmin(session.role)) {
      // Mentors publish to their own batches only.
      if (data.audience !== "BATCH" || !data.batchId) {
        throw new ActionError("Mentors can post announcements to their batches.");
      }
      await assertBatchAccess(session, data.batchId);
    }
    let programId = data.audience === "PROGRAM" ? data.programId || null : null;
    const batchId = data.audience === "BATCH" ? data.batchId || null : null;
    if (batchId) programId = (await assertBatchAccess(session, batchId)).programId;

    const payload = {
      title: data.title,
      body: data.body,
      audience: data.audience,
      programId,
      batchId,
      pinned: data.pinned,
      updatedAt: serverNow(),
    };
    let id = announcementId ? parse(docId, announcementId) : null;
    if (id) {
      const ref = col(COL.announcements).doc(id);
      const existing = fromSnap<Announcement>(await ref.get());
      if (!existing) throw new ActionError("Announcement not found.");
      if (!isAdmin(session.role) && existing.authorId !== session.uid) {
        throw new ActionError("You can only edit your own announcements.");
      }
      await ref.update(payload);
    } else {
      id = (
        await col(COL.announcements).add({
          ...payload,
          authorId: session.uid,
          authorName: session.name,
          createdAt: serverNow(),
        })
      ).id;
    }
    let notified = 0;
    if (data.notify) {
      const uids = await audienceUids(payload);
      await notify(uids, {
        type: "ANNOUNCEMENT",
        title: data.title,
        body: data.body.slice(0, 240),
        link: data.audience === "MENTORS" ? "/mentor" : "/dashboard/announcements",
      });
      notified = uids.length;
    }
    revalidatePath("/admin/announcements");
    revalidatePath("/mentor", "layout");
    revalidatePath("/dashboard", "layout");
    return { id: id!, notified };
  }, "Announcement published");
}

export async function deleteAnnouncement(announcementId: string): Promise<ActionResult> {
  return run(async () => {
    const session = await actor(STAFF_ROLES);
    const ref = col(COL.announcements).doc(parse(docId, announcementId));
    const existing = fromSnap<Announcement>(await ref.get());
    if (!existing) throw new ActionError("Announcement not found.");
    if (!isAdmin(session.role) && existing.authorId !== session.uid) {
      throw new ActionError("You can only delete your own announcements.");
    }
    await ref.delete();
    revalidatePath("/admin/announcements");
    revalidatePath("/mentor", "layout");
    revalidatePath("/dashboard", "layout");
  }, "Announcement deleted");
}

/* ------------------------------ Resources ---------------------------- */

export async function saveResource(resourceId: string | null, input: unknown): Promise<ActionResult> {
  return run(async () => {
    const session = await actor(ADMIN_ROLES);
    const data = parse(resourceSchema, input);
    if (!data.url && !data.storagePath) throw new ActionError("Add a link or upload a file.");
    const file = data.storagePath
      ? await verifyUploadedFile(
          data.storagePath,
          `programs/${data.programId}/resources/`,
          UPLOAD_POLICIES.staffFile,
        )
      : null;
    const payload = {
      programId: data.programId,
      batchId: data.batchId || null,
      title: data.title,
      description: data.description || null,
      type: data.type,
      url: file?.url ?? data.url,
      storagePath: file?.path ?? null,
      updatedAt: serverNow(),
    };
    if (resourceId) {
      const ref = col(COL.resources).doc(parse(docId, resourceId));
      if (!fromSnap<Resource>(await ref.get())) throw new ActionError("Resource not found.");
      await ref.update(payload);
    } else {
      await col(COL.resources).add({ ...payload, createdBy: session.uid, createdAt: serverNow() });
    }
    revalidatePath("/admin/courses");
    revalidatePath("/dashboard/resources");
  }, "Resource saved");
}

export async function deleteResource(resourceId: string): Promise<ActionResult> {
  return run(async () => {
    await actor(ADMIN_ROLES);
    await col(COL.resources).doc(parse(docId, resourceId)).delete();
    revalidatePath("/admin/courses");
    revalidatePath("/dashboard/resources");
  }, "Resource deleted");
}
