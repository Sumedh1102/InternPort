import Link from "next/link";
import { CalendarClock, Inbox, Layers, Users } from "lucide-react";

import { DashboardCard, PageHeader } from "@/components/dashboard/ui";
import { StatusBadge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, Stat } from "@/components/ui/feedback";
import { firstName, formatDate, formatDateTime, relativeTime } from "@/lib/utils";
import { requestTime } from "@/lib/time";
import { requireRole } from "@/server/auth/session";
import { getSessionsForBatches, getUser, listSubmissions } from "@/server/queries/platform";
import { getMentorContext } from "@/server/queries/mentor";

export const metadata = { title: "Overview" };

export default async function MentorOverview() {
  const session = await requireRole(["MENTOR"]);
  const [ctx, user] = await Promise.all([getMentorContext(session.uid), getUser(session.uid)]);
  const [submissions, sessions] = await Promise.all([
    listSubmissions({ batchIds: ctx.batchIds }),
    getSessionsForBatches(ctx.batchIds),
  ]);
  const toReview = submissions.filter((s) => s.status === "SUBMITTED" || s.status === "UNDER_REVIEW");
  const now = requestTime();
  const upcoming = sessions.filter((s) => s.status === "SCHEDULED" && new Date(s.startAt).getTime() > now - 3600e3).slice(0, 5);
  const needsAttendance = sessions.filter((s) => s.status === "SCHEDULED" && new Date(s.startAt).getTime() < now).length;

  return (
    <>
      <PageHeader kicker="Mentor dashboard" title={`Hello ${firstName(user?.name)} 👋`} description="Your batches, reviews and sessions at a glance." />
      {ctx.batches.length === 0 ? (
        <EmptyState icon={<Layers />} title="No batches assigned yet" description="An admin will assign you to a batch. You'll see its students, assignments and sessions here." />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Batches" value={ctx.batches.length} icon={<Layers />} />
            <Stat label="Active students" value={ctx.students.filter((s) => s.status === "ACTIVE").length} icon={<Users />} tone="lime" />
            <Stat label="To review" value={toReview.length} icon={<Inbox />} tone={toReview.length ? "pink" : "paper"} />
            <Stat label="Attendance pending" value={needsAttendance} hint="Past sessions not yet marked" icon={<CalendarClock />} />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <DashboardCard title="Review queue" icon={<Inbox />} href="/mentor/submissions">
              {toReview.length ? (
                <ul className="flex flex-col gap-2">
                  {toReview.slice(0, 6).map((s) => (
                    <li key={s.id}>
                      <Link href={`/mentor/submissions?open=${s.id}`} className="flex items-center justify-between gap-3 rounded-xl border-2 border-ink/15 p-3 hover:border-ink hover:bg-lime-soft">
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">{s.assignmentTitle}</span>
                          <span className="block text-xs text-muted">
                            {s.studentName} · {relativeTime(s.submittedAt)}
                          </span>
                        </span>
                        <StatusBadge status={s.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">Nothing waiting for review. 🎉</p>
              )}
            </DashboardCard>
            <DashboardCard title="Upcoming sessions" icon={<CalendarClock />} href="/mentor/sessions">
              {upcoming.length ? (
                <ul className="flex flex-col gap-2">
                  {upcoming.map((s) => (
                    <li key={s.id} className="rounded-xl border-2 border-ink/15 p-3">
                      <p className="font-semibold">{s.title}</p>
                      <p className="text-xs text-muted">
                        {s.batchName} · {formatDateTime(s.startAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col items-start gap-3">
                  <p className="text-sm text-muted">No sessions scheduled.</p>
                  <Link href="/mentor/sessions" className={buttonVariants({ size: "sm" })}>
                    Schedule a session
                  </Link>
                </div>
              )}
            </DashboardCard>
          </div>
          <section>
            <h2 className="mb-3 font-display text-xl font-extrabold">Your batches</h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ctx.batches.map((b) => (
                <li key={b.id} className="rounded-card border-2 border-ink bg-paper p-5 shadow-brutal-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-xs text-muted">{b.code}</p>
                      <h3 className="font-display text-lg font-extrabold">{b.name}</h3>
                    </div>
                    <StatusBadge status={b.status} />
                  </div>
                  <p className="mt-1 text-sm">{b.programName}</p>
                  <p className="text-xs text-muted">
                    {formatDate(b.startDate)} – {formatDate(b.endDate)}
                  </p>
                  {b.schedule && <p className="mt-1 text-xs">{b.schedule}</p>}
                  <p className="mt-3 font-display text-2xl font-extrabold">
                    {ctx.students.filter((s) => s.batchId === b.id).length}
                    <span className="text-sm font-semibold text-muted"> students</span>
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </>
  );
}
