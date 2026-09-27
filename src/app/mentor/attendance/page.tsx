import { PageHeader } from "@/components/dashboard/ui";
import { AttendancePanel } from "@/components/staff/attendance-panel";
import { requireRole } from "@/server/auth/session";
import { getAttendanceForSession, getSessionsForBatches } from "@/server/queries/platform";
import { getMentorContext } from "@/server/queries/mentor";

export const metadata = { title: "Attendance" };

export default async function MentorAttendancePage({ searchParams }: PageProps<"/mentor/attendance">) {
  const session = await requireRole(["MENTOR"]);
  const { session: sessionParam } = await searchParams;
  const ctx = await getMentorContext(session.uid);
  const sessions = await getSessionsForBatches(ctx.batchIds);
  const selected = sessions.find((s) => s.id === sessionParam) ?? null;
  const records = selected ? await getAttendanceForSession(selected.id) : [];
  return (
    <>
      <PageHeader title="Attendance" description="Mark students present, late, absent or excused for each session." />
      <AttendancePanel basePath="/mentor/attendance" sessions={sessions} selected={selected} enrollments={ctx.enrollments} records={records} />
    </>
  );
}
