import { BarList, ColumnChart, type Datum } from "@/components/charts/bar-charts";
import { PageHeader } from "@/components/dashboard/ui";
import { Stat } from "@/components/ui/feedback";
import {
  APPLICATION_STATUSES,
  ENROLLMENT_STATUSES,
  PAYMENT_STATUSES,
  SUBMISSION_STATUSES,
  label,
} from "@/lib/domain/enums";
import { attendancePercent, percent } from "@/lib/domain/progress";
import { requireRole } from "@/server/auth/session";
import { metricsForEnrollments } from "@/server/metrics";
import {
  getAttendanceForBatches,
  listApplications,
  listBatches,
  listEnrollments,
  listSubmissions,
} from "@/server/queries/platform";
import { getAllPrograms } from "@/server/queries/programs";

export const metadata = { title: "Analytics" };

const count = <T,>(items: T[], pred: (t: T) => boolean) => items.filter(pred).length;

/** Start of the ISO week (Monday) in IST, as yyyy-mm-dd. */
function weekKey(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 5.5 * 3600e3);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

export default async function AdminAnalyticsPage() {
  await requireRole(["ADMIN", "SUPER_ADMIN"]);
  const [applications, enrollments, programs, batches, submissions] = await Promise.all([
    listApplications(5000),
    listEnrollments(),
    getAllPrograms(),
    listBatches(),
    listSubmissions(),
  ]);
  const learning = enrollments.filter((e) => e.status === "ACTIVE" || e.status === "COMPLETED");
  const [metrics, attendance] = await Promise.all([
    metricsForEnrollments(learning),
    getAttendanceForBatches(batches.map((b) => b.id)),
  ]);

  const byStatus: Datum[] = APPLICATION_STATUSES.map((s) => ({ label: label(s), value: count(applications, (a) => a.status === s) }));
  const byProgram: Datum[] = programs
    .map((p) => ({ label: p.name, value: count(applications, (a) => a.programId === p.id) }))
    .sort((a, b) => b.value - a.value);
  const enrollmentStatus: Datum[] = ENROLLMENT_STATUSES.map((s) => ({ label: label(s), value: count(enrollments, (e) => e.status === s) }));
  const liveEnrollments = enrollments.filter((e) => e.status !== "CANCELLED");
  const paymentStatus: Datum[] = PAYMENT_STATUSES.map((s) => ({ label: label(s), value: count(liveEnrollments, (e) => e.payment.status === s) }));
  const submissionStatus: Datum[] = SUBMISSION_STATUSES.filter((s) => s !== "NOT_STARTED" && s !== "IN_PROGRESS").map((s) => ({
    label: label(s),
    value: count(submissions, (x) => x.status === s),
  }));

  // Last 12 weeks of applications.
  const weeks: string[] = [];
  const now = Date.now();
  for (let i = 11; i >= 0; i--) weeks.push(weekKey(new Date(now - i * 7 * 86400e3).toISOString()));
  const perWeek = new Map(weeks.map((w) => [w, 0]));
  for (const a of applications) {
    const k = weekKey(a.createdAt);
    if (perWeek.has(k)) perWeek.set(k, perWeek.get(k)! + 1);
  }
  const trend: Datum[] = weeks.map((w) => ({
    label: new Date(`${w}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" }),
    value: perWeek.get(w)!,
  }));

  const progressByProgram: Datum[] = programs
    .map((p) => {
      const list = learning.filter((e) => e.programId === p.id).map((e) => metrics.get(e.id)?.overall ?? 0);
      const avg = list.length ? Math.round(list.reduce((s, v) => s + v, 0) / list.length) : 0;
      return { label: p.name, value: avg, display: list.length ? `${avg}%` : "—", hint: `${list.length} interns` };
    })
    .filter((d) => d.hint !== "0 interns");

  const attendanceByBatch: Datum[] = batches
    .map((b) => {
      const records = attendance.filter((r) => r.batchId === b.id);
      const pct = attendancePercent(records.map((r) => r.status));
      return { label: b.name, value: pct, display: records.length ? `${pct}%` : "—", hint: `${records.length} records` };
    })
    .filter((d) => d.hint !== "0 records");

  // Pipeline conversion (each stage counts applications that reached it).
  const approvedOrLater = count(applications, (a) => a.status === "APPROVED" || a.status === "ENROLLED");
  const paid = count(enrollments, (e) => e.payment.status === "PAYMENT_CONFIRMED");
  const enrolled = count(applications, (a) => a.status === "ENROLLED");
  const funnel: Datum[] = [
    { label: "Applied", value: applications.length },
    { label: "Approved", value: approvedOrLater, display: `${approvedOrLater}`, hint: `${percent(approvedOrLater, applications.length)}%` },
    { label: "Payment confirmed", value: paid, hint: `${percent(paid, applications.length)}%` },
    { label: "Enrolled", value: enrolled, hint: `${percent(enrolled, applications.length)}%` },
  ];

  const avgProgress = learning.length
    ? Math.round(learning.reduce((s, e) => s + (metrics.get(e.id)?.overall ?? 0), 0) / learning.length)
    : null;
  const overallAttendance = attendance.length ? attendancePercent(attendance.map((r) => r.status)) : null;
  const reviewed = count(submissions, (s) => s.status === "APPROVED" || s.status === "REVISION_REQUIRED");

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Computed live from applications, enrollments, learning activity and attendance. No revenue figures are tracked while payments are verified manually."
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Approval rate" value={applications.length ? `${percent(approvedOrLater, applications.length)}%` : "—"} hint={`${approvedOrLater} of ${applications.length} applications`} />
        <Stat label="Avg. progress" value={avgProgress !== null ? `${avgProgress}%` : "—"} hint={`${learning.length} active or completed interns`} />
        <Stat label="Attendance" value={overallAttendance !== null ? `${overallAttendance}%` : "—"} hint={`${attendance.length} records`} />
        <Stat label="Reviewed submissions" value={reviewed} hint={`${count(submissions, (s) => s.status === "SUBMITTED")} waiting`} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <ColumnChart title="Applications per week" description="Last 12 weeks (IST, weeks start Monday)" data={trend} valueHeader="Applications" className="lg:col-span-2" />
        <BarList title="Application pipeline" description="Share of all applications reaching each stage" data={funnel} valueHeader="Applications" />
        <BarList title="Applications by status" data={byStatus} valueHeader="Applications" />
        <BarList title="Applications by program" data={byProgram} valueHeader="Applications" />
        <BarList title="Enrollment status" data={enrollmentStatus} valueHeader="Enrollments" />
        <BarList title="Manual payment status" description="Excludes cancelled enrollments" data={paymentStatus} valueHeader="Enrollments" />
        <BarList title="Submissions by status" data={submissionStatus} valueHeader="Submissions" />
        <BarList
          title="Average progress by program"
          description="Weighted: lessons, assignments, project, attendance"
          data={progressByProgram}
          max={100}
          valueHeader="Avg. progress"
          emptyText="No active interns yet."
        />
        <BarList title="Attendance by batch" data={attendanceByBatch} max={100} valueHeader="Attendance" emptyText="No attendance recorded yet." />
      </div>
    </>
  );
}
