import "server-only";

import type { Batch, Enrollment } from "@/lib/domain/types";
import { isAdmin } from "@/lib/domain/workflows";
import type { SessionUser } from "./auth/session";
import { COL, col, fromSnap, queryDocs } from "./db";
import { ActionError } from "./actions/_utils";

/** Admins can act on any batch; mentors only on batches they are assigned to. */
export async function assertBatchAccess(session: SessionUser, batchId: string): Promise<Batch> {
  const batch = fromSnap<Batch>(await col(COL.batches).doc(batchId).get());
  if (!batch) throw new ActionError("Batch not found.");
  if (isAdmin(session.role)) return batch;
  if (session.role === "MENTOR" && batch.mentorIds.includes(session.uid)) return batch;
  throw new ActionError("You are not assigned to this batch.");
}

export async function mentorBatches(uid: string): Promise<Batch[]> {
  return queryDocs<Batch>(col(COL.batches).where("mentorIds", "array-contains", uid));
}

/** Staff access to one student's enrollment (mentor must own the batch). */
export async function assertEnrollmentAccess(
  session: SessionUser,
  enrollmentId: string,
): Promise<Enrollment> {
  const enrollment = fromSnap<Enrollment>(await col(COL.enrollments).doc(enrollmentId).get());
  if (!enrollment) throw new ActionError("Enrollment not found.");
  if (isAdmin(session.role)) return enrollment;
  if (session.role === "MENTOR") {
    if (enrollment.mentorId === session.uid) return enrollment;
    if (enrollment.batchId) {
      await assertBatchAccess(session, enrollment.batchId);
      return enrollment;
    }
  }
  throw new ActionError("You don't have access to this student.");
}
