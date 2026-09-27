import "server-only";

import type { NotificationType } from "@/lib/domain/enums";
import type { Enrollment } from "@/lib/domain/types";
import { COL, col, queryDocs, serverNow } from "./db";
import { adminDb } from "./firebase-admin";

export interface NotificationInput {
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
}

/** Writes in-app notifications in chunks (Firestore batches max out at 500 writes). */
export async function notify(uids: string[], n: NotificationInput): Promise<void> {
  const unique = [...new Set(uids.filter(Boolean))];
  for (let i = 0; i < unique.length; i += 400) {
    const batch = adminDb().batch();
    for (const uid of unique.slice(i, i + 400)) {
      batch.set(col(COL.notifications).doc(), {
        uid,
        type: n.type,
        title: n.title.slice(0, 160),
        body: n.body.slice(0, 1000),
        link: n.link ?? null,
        read: false,
        createdAt: serverNow(),
      });
    }
    await batch.commit();
  }
}

/** Active students of a program (optionally narrowed to one batch). */
export async function activeStudentIds(programId: string, batchId?: string | null): Promise<string[]> {
  const enrollments = await queryDocs<Enrollment>(
    col(COL.enrollments).where("programId", "==", programId),
  );
  return enrollments
    .filter((e) => e.status === "ACTIVE" && (!batchId || e.batchId === batchId))
    .map((e) => e.uid);
}

export async function notifyProgramStudents(
  programId: string,
  batchId: string | null | undefined,
  n: NotificationInput,
): Promise<number> {
  const uids = await activeStudentIds(programId, batchId);
  await notify(uids, n);
  return uids.length;
}
