import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import type { Session } from "@/lib/domain/types";
import { COL, Timestamp, col, queryDocs, serverNow } from "@/server/db";
import { notifyProgramStudents } from "@/server/notify";

/**
 * Scheduled job: reminds students about upcoming sessions.
 * Vercel Cron calls it daily (see vercel.json) with `Authorization: Bearer $CRON_SECRET`.
 * Hourly calls work too. The 25-hour look-ahead leaves no gap between daily runs,
 * whose timing drifts within the hour on Vercel's Hobby plan.
 * Idempotent: each session is reminded once (`reminderSentAt`).
 */
const LOOKAHEAD_MS = 25 * 3600e3;

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret || !header.startsWith("Bearer ")) return false;
  const a = Buffer.from(header.slice(7));
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const now = Date.now();
  const upcoming = await queryDocs<Session>(
    col(COL.sessions)
      .where("startAt", ">=", Timestamp.fromMillis(now))
      .where("startAt", "<=", Timestamp.fromMillis(now + LOOKAHEAD_MS)),
  );
  let reminded = 0;
  for (const s of upcoming) {
    if (s.status !== "SCHEDULED" || s.reminderSentAt) continue;
    const when = new Date(s.startAt).toLocaleString("en-IN", {
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "Asia/Kolkata",
    });
    await notifyProgramStudents(s.programId, s.batchId, {
      type: "SESSION_REMINDER",
      title: "Session reminder",
      body: `${s.title} starts ${when}.`,
      link: "/dashboard",
    });
    await col(COL.sessions).doc(s.id).update({ reminderSentAt: serverNow() });
    reminded += 1;
  }
  return NextResponse.json({ ok: true, reminded });
}
