import { Trash2 } from "lucide-react";

import { BatchDialog } from "@/components/admin/catalog-forms";
import { PageHeader } from "@/components/dashboard/ui";
import { ActionButton } from "@/components/ui/action-button";
import { StatusBadge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { BATCH_STATUSES, label } from "@/lib/domain/enums";
import { formatDate } from "@/lib/utils";
import { deleteBatch } from "@/server/actions/admin";
import { requireRole } from "@/server/auth/session";
import { getAdminOptions } from "@/server/queries/admin";
import { listEnrollments } from "@/server/queries/platform";

export const metadata = { title: "Batches" };

export default async function AdminBatchesPage() {
  await requireRole(["ADMIN", "SUPER_ADMIN"]);
  const [options, enrollments] = await Promise.all([getAdminOptions(), listEnrollments()]);
  const mentorName = new Map(options.mentors.map((m) => [m.id, m.name]));
  return (
    <>
      <PageHeader
        title="Batches"
        description="Group students by program and start date, and assign mentors."
        actions={<BatchDialog programs={options.programOptions} mentors={options.mentorOptions} />}
      />
      <DataTable
        caption="Batches"
        filters={[
          { key: "status", label: "Status", options: BATCH_STATUSES.map((s) => ({ value: s, label: label(s) })) },
          { key: "program", label: "Program", options: options.programOptions.map((p) => ({ value: p.id, label: p.name })) },
        ]}
        columns={[
          { key: "name", header: "Batch", sortable: true },
          { key: "dates", header: "Dates", sortable: true, hideOnMobile: true },
          { key: "mentors", header: "Mentors" },
          { key: "students", header: "Students", sortable: true },
          { key: "status", header: "Status" },
          { key: "actions", header: "" },
        ]}
        emptyTitle="No batches yet"
        emptyDescription="Create a batch so approved students can be activated."
        rows={options.batches.map((b) => {
          const count = enrollments.filter((e) => e.batchId === b.id && (e.status === "ACTIVE" || e.status === "COMPLETED")).length;
          return {
            id: b.id,
            search: `${b.name} ${b.code} ${b.programName}`,
            filters: { status: b.status, program: b.programId },
            sort: { name: b.name, dates: b.startDate, students: count },
            cells: {
              name: (
                <div>
                  <p className="font-semibold">{b.name}</p>
                  <p className="text-xs text-muted">
                    <span className="font-mono">{b.code}</span> · {b.programName}
                  </p>
                </div>
              ),
              dates: (
                <span className="text-sm">
                  {formatDate(b.startDate)} – {formatDate(b.endDate)}
                  {b.schedule && <span className="block text-xs text-muted">{b.schedule}</span>}
                </span>
              ),
              mentors: b.mentorIds.length ? b.mentorIds.map((id) => mentorName.get(id) ?? "Unknown").join(", ") : <span className="text-muted">None</span>,
              students: `${count}/${b.capacity}`,
              status: <StatusBadge status={b.status} />,
              actions: (
                <div className="flex gap-1">
                  <BatchDialog batch={b} programs={options.programOptions} mentors={options.mentorOptions} />
                  <ActionButton
                    action={deleteBatch.bind(null, b.id)}
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Delete ${b.name}`}
                    confirm={{ title: `Delete ${b.name}?`, description: "Only possible when no students are assigned.", danger: true, confirmLabel: "Delete" }}
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
