import { PageHeader } from "@/components/dashboard/ui";
import { AssignmentFormDialog } from "@/components/staff/assignment-form";
import { StatusBadge } from "@/components/ui/badge";
import { ActionButton } from "@/components/ui/action-button";
import { DataTable } from "@/components/ui/data-table";
import { Trash2 } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { deleteAssignment } from "@/server/actions/assignments";
import { requireRole } from "@/server/auth/session";
import { listAssignments, listSubmissions } from "@/server/queries/platform";
import { getMentorContext } from "@/server/queries/mentor";

export const metadata = { title: "Assignments" };

export default async function MentorAssignmentsPage() {
  const session = await requireRole(["MENTOR"]);
  const ctx = await getMentorContext(session.uid);
  const programIds = [...new Set(ctx.batches.map((b) => b.programId))];
  const [assignments, submissions] = await Promise.all([
    listAssignments(programIds),
    listSubmissions({ batchIds: ctx.batchIds }),
  ]);
  // Program-wide assignments (read-only for mentors) + assignments for the mentor's batches.
  const visible = assignments.filter((a) => !a.batchId || ctx.batchIds.includes(a.batchId));
  const batchOptions = ctx.batches.map((b) => ({ id: b.id, name: `${b.name} · ${b.programName}`, programId: b.programId }));
  const programOptions = programIds.map((id) => ({ id, name: ctx.programs.get(id)?.name ?? id }));

  return (
    <>
      <PageHeader
        title="Assignments"
        description="Create assignments for your batches. Program-wide assignments are managed by admins."
        actions={batchOptions.length ? <AssignmentFormDialog programs={programOptions} batches={batchOptions} mentorMode /> : undefined}
      />
      <DataTable
        caption="Assignments"
        columns={[
          { key: "title", header: "Assignment", sortable: true },
          { key: "target", header: "For" },
          { key: "due", header: "Due", sortable: true },
          { key: "subs", header: "Submissions", hideOnMobile: true },
          { key: "status", header: "Status" },
          { key: "actions", header: "" },
        ]}
        emptyTitle="No assignments yet"
        emptyDescription="Create your first assignment for a batch."
        rows={visible.map((a) => {
          const own = Boolean(a.batchId);
          const subs = submissions.filter((s) => s.assignmentId === a.id);
          return {
            id: a.id,
            search: a.title,
            sort: { title: a.title, due: a.dueDate },
            cells: {
              title: <span className="font-semibold">{a.title}</span>,
              target: own ? ctx.batches.find((b) => b.id === a.batchId)?.name : <span className="text-muted">Whole program</span>,
              due: formatDateTime(a.dueDate),
              subs: `${subs.length} submitted · ${subs.filter((s) => s.status === "APPROVED").length} approved`,
              status: <StatusBadge status={a.status} />,
              actions: own ? (
                <div className="flex gap-1">
                  <AssignmentFormDialog assignment={a} programs={programOptions} batches={batchOptions} mentorMode />
                  <ActionButton
                    action={deleteAssignment.bind(null, a.id)}
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete ${a.title}`}
                    confirm={{ title: "Delete assignment?", description: "Only possible before any student starts it.", danger: true, confirmLabel: "Delete" }}
                  >
                    <Trash2 aria-hidden />
                  </ActionButton>
                </div>
              ) : null,
            },
          };
        })}
      />
    </>
  );
}
