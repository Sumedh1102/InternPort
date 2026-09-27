import { StatusBadge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { Progress } from "@/components/ui/feedback";
import { ENROLLMENT_STATUSES, SUBMISSION_STATUSES, label } from "@/lib/domain/enums";
import type { Enrollment, Project, Submission } from "@/lib/domain/types";
import { formatDateTime, relativeTime } from "@/lib/utils";
import type { EnrollmentMetrics } from "@/server/metrics";
import { ProjectAssignDialog, ProjectReviewDialog, SubmissionReviewDialog } from "./review-forms";

/** Student progress table used by mentors (their batches) and admins (everyone). */
export function StudentProgressTable({
  enrollments,
  metrics,
  projects,
  canFeature = false,
  extraColumns,
}: {
  enrollments: Enrollment[];
  metrics: Map<string, EnrollmentMetrics>;
  projects: Project[];
  canFeature?: boolean;
  extraColumns?: { header: string; key: string; render: (e: Enrollment) => React.ReactNode }[];
}) {
  const projectByEnrollment = new Map(projects.map((p) => [p.enrollmentId, p]));
  return (
    <DataTable
      caption="Students"
      searchPlaceholder="Search students…"
      filters={[
        { key: "status", label: "Status", options: ENROLLMENT_STATUSES.map((s) => ({ value: s, label: label(s) })) },
        {
          key: "batch",
          label: "Batch",
          options: [...new Set(enrollments.map((e) => e.batchName).filter(Boolean))].map((b) => ({ value: b!, label: b! })),
        },
      ]}
      columns={[
        { key: "student", header: "Student", sortable: true },
        { key: "progress", header: "Overall", sortable: true },
        { key: "lessons", header: "Lessons", sortable: true, hideOnMobile: true },
        { key: "assignments", header: "Assignments", hideOnMobile: true },
        { key: "attendance", header: "Attendance", sortable: true, hideOnMobile: true },
        { key: "project", header: "Project" },
        ...(extraColumns ?? []).map((c) => ({ key: c.key, header: c.header })),
      ]}
      emptyTitle="No students yet"
      emptyDescription="Students appear here once their enrollment is activated."
      rows={enrollments.map((e) => {
        const m = metrics.get(e.id);
        const project = projectByEnrollment.get(e.id);
        return {
          id: e.id,
          search: `${e.studentName} ${e.studentEmail} ${e.programName} ${e.batchName ?? ""}`,
          filters: { status: e.status, batch: e.batchName ?? "" },
          sort: { student: e.studentName, progress: m?.overall ?? 0, lessons: m?.lessonPercent ?? 0, attendance: m?.attendancePercent ?? 0 },
          cells: {
            student: (
              <div className="min-w-0">
                <p className="font-semibold">{e.studentName}</p>
                <p className="truncate text-xs text-muted">
                  {e.programName} · {e.batchName ?? "No batch"}
                </p>
                {e.status !== "ACTIVE" && <StatusBadge status={e.status} className="mt-1" />}
              </div>
            ),
            progress: m ? (
              <div className="w-28">
                <span className="font-display font-extrabold">{m.overall}%</span>
                <Progress value={m.overall} size="sm" label={`${e.studentName} overall progress`} />
              </div>
            ) : (
              "—"
            ),
            lessons: m ? `${m.lessonsCompleted}/${m.lessonsTotal}` : "—",
            assignments: m ? (
              <span>
                {m.assignmentsApproved}/{m.assignmentsTotal} approved
                {m.assignmentsOverdue > 0 && <span className="block text-xs font-semibold text-red">{m.assignmentsOverdue} overdue</span>}
              </span>
            ) : (
              "—"
            ),
            attendance: m?.has.attendance ? `${m.attendancePercent}%` : "—",
            project: project ? (
              <div className="flex flex-col items-start gap-1.5">
                <StatusBadge status={project.status} />
                <ProjectReviewDialog project={project} canFeature={canFeature} />
              </div>
            ) : e.status === "ACTIVE" ? (
              <ProjectAssignDialog enrollmentId={e.id} studentName={e.studentName} />
            ) : (
              "—"
            ),
            ...Object.fromEntries((extraColumns ?? []).map((c) => [c.key, c.render(e)])),
          },
        };
      })}
    />
  );
}

export function SubmissionsTable({ submissions, openId }: { submissions: Submission[]; openId?: string }) {
  return (
    <DataTable
      caption="Submissions"
      searchPlaceholder="Search by student or assignment…"
      initialFilters={{ status: submissions.some((s) => s.status === "SUBMITTED") ? "SUBMITTED" : "" }}
      filters={[
        {
          key: "status",
          label: "Status",
          options: SUBMISSION_STATUSES.filter((s) => s !== "NOT_STARTED" && s !== "IN_PROGRESS").map((s) => ({ value: s, label: label(s) })),
        },
      ]}
      columns={[
        { key: "assignment", header: "Assignment", sortable: true },
        { key: "student", header: "Student", sortable: true },
        { key: "submitted", header: "Submitted", sortable: true, hideOnMobile: true },
        { key: "status", header: "Status" },
        { key: "score", header: "Score", hideOnMobile: true },
        { key: "action", header: "" },
      ]}
      emptyTitle="No submissions yet"
      emptyDescription="Student submissions appear here as soon as they're submitted."
      rows={submissions.map((s) => ({
        id: s.id,
        search: `${s.assignmentTitle} ${s.studentName}`,
        filters: { status: s.status },
        sort: { assignment: s.assignmentTitle, student: s.studentName, submitted: s.submittedAt ?? "" },
        cells: {
          assignment: <span className="font-semibold">{s.assignmentTitle}</span>,
          student: s.studentName,
          submitted: (
            <span title={formatDateTime(s.submittedAt)}>
              {relativeTime(s.submittedAt)}
              {(s as Submission & { late?: boolean }).late && <span className="block text-xs font-semibold text-red">Late</span>}
            </span>
          ),
          status: <StatusBadge status={s.status} />,
          score: typeof s.score === "number" ? `${s.score}/${s.maxScore}` : "—",
          action: <SubmissionReviewDialog submission={s} defaultOpen={openId === s.id} />,
        },
      }))}
    />
  );
}
