import { CalendarCheck, Video } from "lucide-react";

import { DashboardCard, Locked, PageHeader, ProgressRing } from "@/components/dashboard/ui";
import { StatusBadge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState, Stat } from "@/components/ui/feedback";
import { ATTENDANCE_STATUSES, label } from "@/lib/domain/enums";
import { attendancePercent } from "@/lib/domain/progress";
import { formatDate, formatDateTime } from "@/lib/utils";
import { requestTime } from "@/lib/time";
import { requireRole } from "@/server/auth/session";
import { getAttendanceForUser, getSessionsForBatches } from "@/server/queries/platform";
import { getStudentContext } from "@/server/queries/student";

export const metadata = { title: "Attendance" };

export default async function AttendancePage() {
  const session = await requireRole(["STUDENT"]);
  const ctx = (await getStudentContext(session.uid))!;
  if (!ctx.active || !ctx.enrollment) {
    return (
      <>
        <PageHeader title="Attendance" />
        <Locked title="Attendance unlocks after enrollment" />
      </>
    );
  }
  const e = ctx.enrollment;
  const [records, sessions] = await Promise.all([
    getAttendanceForUser(session.uid),
    e.batchId ? getSessionsForBatches([e.batchId]) : Promise.resolve([]),
  ]);
  const mine = records.filter((r) => r.programId === e.programId);
  const pct = attendancePercent(mine.map((r) => r.status));
  const counts = Object.fromEntries(ATTENDANCE_STATUSES.map((s) => [s, mine.filter((r) => r.status === s).length]));
  const now = requestTime();
  const upcoming = sessions.filter((s) => s.status === "SCHEDULED" && new Date(s.startAt).getTime() + s.durationMinutes * 60e3 > now);

  return (
    <>
      <PageHeader title="Attendance" description="Attendance is marked by your mentor for each live session. Excused sessions don't count against you." />
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="flex flex-col gap-4">
          <div className="rounded-card border-2 border-ink bg-paper p-5 shadow-brutal-sm">
            <ProgressRing value={pct} label="Attendance" sublabel={mine.length ? `${mine.length} sessions recorded` : "No sessions recorded yet"} tone="cyan" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {ATTENDANCE_STATUSES.map((s) => (
              <Stat key={s} label={label(s)} value={counts[s] ?? 0} />
            ))}
          </div>
          <DashboardCard title="Upcoming sessions" icon={<Video />}>
            {upcoming.length ? (
              <ul className="flex flex-col gap-3">
                {upcoming.map((s) => (
                  <li key={s.id} className="flex flex-col gap-1 rounded-xl border-2 border-ink/15 p-3">
                    <span className="font-semibold">{s.title}</span>
                    <span className="text-xs text-muted">
                      {formatDateTime(s.startAt)} · {label(s.type)}
                    </span>
                    {s.meetingUrl && (
                      <a href={s.meetingUrl} target="_blank" rel="noreferrer" className={buttonVariants({ size: "sm", variant: "outline" })}>
                        Join session
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No upcoming sessions.</p>
            )}
          </DashboardCard>
        </div>
        {mine.length ? (
          <DataTable
            caption="Attendance records"
            filters={[{ key: "status", label: "Status", options: ATTENDANCE_STATUSES.map((s) => ({ value: s, label: label(s) })) }]}
            columns={[
              { key: "session", header: "Session", sortable: true },
              { key: "date", header: "Date", sortable: true },
              { key: "status", header: "Status" },
            ]}
            rows={mine.map((r) => ({
              id: r.id,
              search: r.sessionTitle,
              filters: { status: r.status },
              sort: { session: r.sessionTitle, date: r.date },
              cells: {
                session: <span className="font-semibold">{r.sessionTitle}</span>,
                date: formatDate(r.date),
                status: <StatusBadge status={r.status} />,
              },
            }))}
          />
        ) : (
          <EmptyState icon={<CalendarCheck />} title="No attendance yet" description="Your attendance will appear here after your first live session." />
        )}
      </div>
    </>
  );
}
