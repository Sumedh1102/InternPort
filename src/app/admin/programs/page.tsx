import Link from "next/link";
import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/dashboard/ui";
import { ActionButton } from "@/components/ui/action-button";
import { StatusBadge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { PROGRAM_STATUSES, label } from "@/lib/domain/enums";
import { formatINR } from "@/lib/domain/pricing";
import { deleteProgram, setProgramStatus } from "@/server/actions/admin";
import { requireRole } from "@/server/auth/session";
import { listApplications, listEnrollments } from "@/server/queries/platform";
import { getAllPrograms } from "@/server/queries/programs";

export const metadata = { title: "Programs" };

export default async function AdminProgramsPage() {
  await requireRole(["ADMIN", "SUPER_ADMIN"]);
  const [programs, applications, enrollments] = await Promise.all([getAllPrograms(), listApplications(), listEnrollments()]);
  return (
    <>
      <PageHeader
        title="Programs"
        description="Everything on the public internship pages comes from here: fees, duration, curriculum, roadmap and status."
        actions={
          <Link href="/admin/programs/new" className={buttonVariants({ size: "sm" })}>
            <Plus aria-hidden /> New program
          </Link>
        }
      />
      <DataTable
        caption="Programs"
        filters={[{ key: "status", label: "Status", options: PROGRAM_STATUSES.map((s) => ({ value: s, label: label(s) })) }]}
        columns={[
          { key: "name", header: "Program", sortable: true },
          { key: "fees", header: "Fees / month", hideOnMobile: true },
          { key: "numbers", header: "Applications", sortable: true, hideOnMobile: true },
          { key: "status", header: "Status" },
          { key: "actions", header: "" },
        ]}
        emptyTitle="No programs yet"
        emptyDescription="Create a program or run `npm run seed` to load the Winter Internship 2026 catalogue."
        rows={programs.map((p) => {
          const apps = applications.filter((a) => a.programId === p.id).length;
          const active = enrollments.filter((e) => e.programId === p.id && e.status === "ACTIVE").length;
          return {
            id: p.id,
            search: `${p.name} ${p.domain} ${p.slug}`,
            filters: { status: p.status },
            sort: { name: p.order, numbers: apps },
            cells: {
              name: (
                <div>
                  <Link href={`/admin/programs/${p.id}`} className="font-semibold underline decoration-2 underline-offset-4">
                    {p.name}
                  </Link>
                  <p className="font-mono text-xs text-muted">/{p.slug} · {p.durationLabel}</p>
                </div>
              ),
              fees: (
                <span className="text-sm">
                  {formatINR(p.fees.earlyBird)} early · {formatINR(p.fees.regular)}
                </span>
              ),
              numbers: (
                <span className="text-sm">
                  {apps} applications
                  <span className="block text-xs text-muted">{active} active interns</span>
                </span>
              ),
              status: <StatusBadge status={p.status} />,
              actions: (
                <div className="flex flex-wrap items-center gap-1">
                  {p.status !== "PUBLISHED" && (
                    <ActionButton action={setProgramStatus.bind(null, p.id, "PUBLISHED")} size="sm" variant="outline">
                      Publish
                    </ActionButton>
                  )}
                  {p.status === "PUBLISHED" && (
                    <ActionButton action={setProgramStatus.bind(null, p.id, "PAUSED")} size="sm" variant="ghost">
                      Pause
                    </ActionButton>
                  )}
                  {p.status !== "ARCHIVED" && (
                    <ActionButton
                      action={setProgramStatus.bind(null, p.id, "ARCHIVED")}
                      size="sm"
                      variant="ghost"
                      confirm={{ title: `Archive ${p.name}?`, description: "It will be hidden from the public site." }}
                    >
                      Archive
                    </ActionButton>
                  )}
                  <Link href={`/admin/programs/${p.id}`} className={buttonVariants({ size: "icon-sm", variant: "ghost" })} aria-label={`Edit ${p.name}`}>
                    <Pencil aria-hidden />
                  </Link>
                  {(p.status === "PUBLISHED" || p.status === "PAUSED") && (
                    <a href={`/internships/${p.slug}`} target="_blank" rel="noreferrer" className={buttonVariants({ size: "icon-sm", variant: "ghost" })} aria-label={`View ${p.name} on the website`}>
                      <ExternalLink aria-hidden />
                    </a>
                  )}
                  <ActionButton
                    action={deleteProgram.bind(null, p.id)}
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Delete ${p.name}`}
                    confirm={{ title: `Delete ${p.name}?`, description: "Only possible when it has no applications. Prefer archiving.", danger: true, confirmLabel: "Delete" }}
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
