import Link from "next/link";
import { ClipboardList } from "lucide-react";

import { Locked, PageHeader } from "@/components/dashboard/ui";
import { StatusBadge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/feedback";
import { SUBMISSION_STATUSES, label } from "@/lib/domain/enums";
import { cn, formatDateTime, relativeTime } from "@/lib/utils";
import { requestTime } from "@/lib/time";
import { requireRole } from "@/server/auth/session";
import { getAssignmentsForEnrollment, getSubmissionsForUser } from "@/server/queries/platform";
import { getStudentContext } from "@/server/queries/student";

export const metadata = { title: "Assignments" };

export default async function AssignmentsPage() {
  const session = await requireRole(["STUDENT"]);
  const ctx = (await getStudentContext(session.uid))!;
  if (!ctx.active || !ctx.enrollment) {
    return (
      <>
        <PageHeader title="Assignments" />
        <Locked title="Assignments unlock after enrollment" />
      </>
    );
  }
  const [assignments, submissions] = await Promise.all([
    getAssignmentsForEnrollment(ctx.enrollment),
    getSubmissionsForUser(session.uid),
  ]);
  const byAssignment = new Map(submissions.map((s) => [s.assignmentId, s]));
  const now = requestTime();

  return (
    <>
      <PageHeader title="Assignments" description="Submit your work with a GitHub link, live URL or files. Mentors review and score every submission." />
      {assignments.length === 0 ? (
        <EmptyState icon={<ClipboardList />} title="No assignments yet" description="New assignments will show up here and in your notifications." />
      ) : (
        <DataTable
          caption="Assignments"
          searchPlaceholder="Search assignments…"
          filters={[{ key: "status", label: "Status", options: SUBMISSION_STATUSES.map((s) => ({ value: s, label: label(s) })) }]}
          columns={[
            { key: "title", header: "Assignment", sortable: true },
            { key: "due", header: "Due", sortable: true },
            { key: "status", header: "Status" },
            { key: "score", header: "Score", sortable: true, hideOnMobile: true },
          ]}
          rows={assignments.map((a) => {
            const sub = byAssignment.get(a.id);
            const status = sub?.status ?? "NOT_STARTED";
            const open = status === "NOT_STARTED" || status === "IN_PROGRESS" || status === "REVISION_REQUIRED";
            const overdue = open && new Date(a.dueDate).getTime() < now;
            return {
              id: a.id,
              search: `${a.title} ${a.description}`,
              filters: { status },
              sort: { title: a.title, due: a.dueDate, score: sub?.score ?? -1 },
              cells: {
                title: (
                  <Link href={`/dashboard/assignments/${a.id}`} className="font-semibold underline decoration-2 underline-offset-4 hover:decoration-pink">
                    {a.title}
                  </Link>
                ),
                due: (
                  <span className={cn(overdue && "font-semibold text-red")}>
                    {formatDateTime(a.dueDate)}
                    <span className="block text-xs text-muted">{overdue ? "Overdue" : relativeTime(a.dueDate)}</span>
                  </span>
                ),
                status: <StatusBadge status={status} />,
                score: typeof sub?.score === "number" ? `${sub.score}/${a.maxScore}` : "—",
              },
            };
          })}
        />
      )}
    </>
  );
}
