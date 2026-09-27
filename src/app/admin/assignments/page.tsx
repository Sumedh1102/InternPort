import { Trash2 } from "lucide-react";

import { PageHeader } from "@/components/dashboard/ui";
import { AssignmentFormDialog } from "@/components/staff/assignment-form";
import { ActionButton } from "@/components/ui/action-button";
import { StatusBadge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { CONTENT_STATUSES, label } from "@/lib/domain/enums";
import { formatDateTime } from "@/lib/utils";
import { deleteAssignment } from "@/server/actions/assignments";
import { requireRole } from "@/server/auth/session";
import { getAdminOptions } from "@/server/queries/admin";
import { listAssignments, listSubmissions } from "@/server/queries/platform";

export const metadata = { title: "Assignments" };

export default async function AdminAssignmentsPage() {
  await requireRole(["ADMIN", "SUPER_ADMIN"]);
  const [options, assignments, submissions] = await Promise.all([getAdminOptions(), listAssignments(), listSubmissions()]);
  const programName = new Map(options.programs.map((p) => [p.id, p.name]));
  const batchName = new Map(options.batches.map((b) => [b.id, b.name]));
  return (
    <>
      <PageHeader
        title="Assignments"
        description="Program-wide or batch-specific assignments. Publishing notifies the students it targets."
        actions={options.programs.length ? <AssignmentFormDialog programs={options.programOptions} batches={options.batchOptions} /> : undefined}
      />
      <DataTable
        caption="Assignments"
        filters={[
          { key: "program", label: "Program", options: options.programOptions.map((p) => ({ value: p.id, label: p.name })) },
          { key: "status", label: "Status", options: CONTENT_STATUSES.map((s) => ({ value: s, label: label(s) })) },
        ]}
        columns={[
          { key: "title", header: "Assignment", sortable: true },
          { key: "target", header: "Program / batch", hideOnMobile: true },
          { key: "due", header: "Due", sortable: true },
          { key: "subs", header: "Submissions", hideOnMobile: true },
          { key: "status", header: "Status" },
          { key: "actions", header: "" },
        ]}
        emptyTitle="No assignments yet"
        rows={assignments.map((a) => {
          const subs = submissions.filter((s) => s.assignmentId === a.id);
          return {
            id: a.id,
            search: `${a.title} ${a.createdByName}`,
            filters: { program: a.programId, status: a.status },
            sort: { title: a.title, due: a.dueDate },
            cells: {
              title: (
                <div>
                  <p className="font-semibold">{a.title}</p>
                  <p className="text-xs text-muted">by {a.createdByName}</p>
                </div>
              ),
              target: (
                <span className="text-sm">
                  {programName.get(a.programId)}
                  <span className="block text-xs text-muted">{a.batchId ? batchName.get(a.batchId) : "All batches"}</span>
                </span>
              ),
              due: formatDateTime(a.dueDate),
              subs: `${subs.length} submitted · ${subs.filter((s) => s.status === "APPROVED").length} approved`,
              status: <StatusBadge status={a.status} />,
              actions: (
                <div className="flex gap-1">
                  <AssignmentFormDialog assignment={a} programs={options.programOptions} batches={options.batchOptions} />
                  <ActionButton
                    action={deleteAssignment.bind(null, a.id)}
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Delete ${a.title}`}
                    confirm={{ title: "Delete assignment?", description: "Only possible before any student starts it.", danger: true, confirmLabel: "Delete" }}
                  >
                    <Trash2 aria-hidden />
                  </ActionButton>
                </div>
              ),
            },
          };
        })}
      />
    </>
  );
}
