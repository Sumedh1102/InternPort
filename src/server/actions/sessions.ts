"use server";

import { revalidatePath } from "next/cache";

import { STAFF_ROLES } from "@/lib/domain/enums";
import { attendanceSchema, docId, sessionSchema } from "@/lib/domain/schemas";
import type { ActionResult, Enrollment, Session } from "@/lib/domain/types";
import { assertBatchAccess } from "../access";
import { COL, col, fromSnap, queryDocs, serverNow, toTimestamp } from "../db";
import { adminDb } from "../firebase-admin";
import { notifyProgramStudents } from "../notify";
import { ActionError, actor, parse, run } from "./_utils";

function revalidateSessions() {
  revalidatePath("/mentor", "layout");
  revalidatePath("/admin/attendance");
  revalidatePath("/dashboard", "layout");
}

function when(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

export async function saveSession(sessionId: string | null, input: unknown): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const session = await actor(STAFF_ROLES);
    const data = parse(sessionSchema, input);
    const batch = await assertBatchAccess(session, data.batchId);
    const payload = {
      programId: batch.programId,
      batchId: batch.id,
      batchName: batch.name,
      title: data.title,
      description: data.description || null,
      type: data.type,
      startAt: toTimestamp(data.startAt),
      durationMinutes: data.durationMinutes,
      meetingUrl: data.meetingUrl || null,
      status: data.status,
      updatedAt: serverNow(),
    };
    let id = sessionId ? parse(docId, sessionId) : null;
    if (id) {
      const ref = col(COL.sessions).doc(id);
      const existing = fromSnap<Session>(await ref.get());
      if (!existing) throw new ActionError("Session not found.");
      await assertBatchAccess(session, existing.batchId);
      await ref.update(payload);
      if (existing.status !== "CANCELLED" && data.status === "CANCELLED") {
        await notifyProgramStudents(batch.programId, batch.id, {
          type: "SESSION_SCHEDULED",
          title: "Session cancelled",
          body: `${data.title} (${when(data.startAt)}) has been cancelled.`,
          link: "/dashboard/attendance",
        });
      }
    } else {
      id = (
        await col(COL.sessions).add({
          ...payload,
          mentorId: session.uid,
          mentorName: session.name,
          createdAt: serverNow(),
        })
      ).id;
      await notifyProgramStudents(batch.programId, batch.id, {
        type: "SESSION_SCHEDULED",
        title: "New session scheduled",
        body: `${data.title} — ${when(data.startAt)}`,
        link: "/dashboard",
      });
    }
    revalidateSessions();
    return { id: id! };
  }, "Session saved");
}

export async function sendSessionReminder(sessionId: string): Promise<ActionResult<{ count: number }>> {
  return run(async () => {
    const actorSession = await actor(STAFF_ROLES);
    const ref = col(COL.sessions).doc(parse(docId, sessionId));
    const s = fromSnap<Session>(await ref.get());
    if (!s) throw new ActionError("Session not found.");
    await assertBatchAccess(actorSession, s.batchId);
    if (s.status !== "SCHEDULED") throw new ActionError("Only scheduled sessions can send reminders.");
    const count = await notifyProgramStudents(s.programId, s.batchId, {
      type: "SESSION_REMINDER",
      title: "Session reminder",
      body: `${s.title} starts ${when(s.startAt)}.${s.meetingUrl ? " Join link is on your dashboard." : ""}`,
      link: "/dashboard",
    });
    await ref.update({ reminderSentAt: serverNow() });
    return { count };
  }, "Reminder sent");
}

/**
 * Marks attendance for every listed student. Record ids are `${sessionId}_${uid}` so
 * re-marking overwrites instead of duplicating. Only ACTIVE students of the session's
 * batch can be marked.
 */
export async function markAttendance(input: unknown): Promise<ActionResult<{ count: number }>> {
  return run(async () => {
    const session = await actor(STAFF_ROLES);
    const data = parse(attendanceSchema, input);
    const s = fromSnap<Session>(await col(COL.sessions).doc(data.sessionId).get());
    if (!s) throw new ActionError("Session not found.");
    await assertBatchAccess(session, s.batchId);
    if (s.status === "CANCELLED") throw new ActionError("This session was cancelled.");
    if (new Date(s.startAt).getTime() > Date.now() + 60 * 60 * 1000) {
      throw new ActionError("Attendance opens an hour before the session starts.");
    }

    const enrollments = await queryDocs<Enrollment>(
      col(COL.enrollments).where("batchId", "==", s.batchId),
    );
    const roster = new Map(
      enrollments.filter((e) => e.status === "ACTIVE" || e.status === "COMPLETED").map((e) => [e.uid, e]),
    );
    const unknown = data.records.filter((r) => !roster.has(r.uid));
    if (unknown.length) throw new ActionError("Some students are not active in this batch.");

    const batch = adminDb().batch();
    for (const record of data.records) {
      const e = roster.get(record.uid)!;
      batch.set(col(COL.attendance).doc(`${s.id}_${record.uid}`), {
        sessionId: s.id,
        sessionTitle: s.title,
        batchId: s.batchId,
        programId: s.programId,
        uid: record.uid,
        studentName: e.studentName,
        date: toTimestamp(s.startAt),
        status: record.status,
        markedBy: session.uid,
        markedAt: serverNow(),
      });
    }
    if (new Date(s.startAt).getTime() <= Date.now() && s.status === "SCHEDULED") {
      batch.update(col(COL.sessions).doc(s.id), { status: "COMPLETED", updatedAt: serverNow() });
    }
    await batch.commit();
    revalidateSessions();
    return { count: data.records.length };
  }, "Attendance saved");
}
