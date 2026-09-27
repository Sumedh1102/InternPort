import { PageHeader } from "@/components/dashboard/ui";
import { AttendancePanel } from "@/components/staff/attendance-panel";
import { SessionFormDialog } from "@/components/staff/session-forms";
import { attendancePercent } from "@/lib/domain/progress";
import { requireRole } from "@/server/auth/session";
import { getAdminOptions } from "@/server/queries/admin";
import { getAttendanceForBatches, getAttendanceForSession, listEnrollments, listSessions } from "@/server/queries/platform";

export const metadata = { title: "Attendance" };

export default async function AdminAttendancePage({ searchParams }: PageProps<"/admin/attendance">) {
  await requireRole(["ADMIN", "SUPER_ADMIN"]);
  const { session: sessionParam } = await searchParams;
  const [options, sessions, enrollments] = await Promise.all([getAdminOptions(), listSessions(), listEnrollments()]);
  const selected = sessions.find((s) => s.id === sessionParam) ?? null;
  const [records, allRecords] = await Promise.all([
    selected ? getAttendanceForSession(selected.id) : Promise.resolve([]),
    getAttendanceForBatches(options.batches.map((b) => b.id)),
  ]);
  return (
    <>
      <PageHeader
        title="Attendance"
        description="Schedule sessions for any batch and mark or correct attendance. QR check-in is planned for a future release."
        actions={<SessionFormDialog batches={options.batchOptions} />}
      />
      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Attendance by batch">
        {options.batches.map((b) => {
          const batchRecords = allRecords.filter((r) => r.batchId === b.id);
          return (
            <div key={b.id} className="rounded-2xl border-2 border-ink bg-paper p-4">
              <p className="truncate text-sm font-semibold">{b.name}</p>
              <p className="font-display text-2xl font-extrabold">{batchRecords.length ? `${attendancePercent(batchRecords.map((r) => r.status))}%` : "—"}</p>
              <p className="text-xs text-muted">{batchRecords.length} records</p>
            </div>
          );
        })}
      </section>
      <AttendancePanel basePath="/admin/attendance" sessions={sessions} selected={selected} enrollments={enrollments} records={records} />
    </>
  );
}
