import Link from "next/link";
import { Download } from "lucide-react";

import { PageHeader } from "@/components/dashboard/ui";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { APPLICATION_STATUSES, label } from "@/lib/domain/enums";
import { formatDate } from "@/lib/utils";
import { requireRole } from "@/server/auth/session";
import { listApplications } from "@/server/queries/platform";
import { getAllPrograms } from "@/server/queries/programs";

export const metadata = { title: "Applications" };

export default async function AdminApplicationsPage({ searchParams }: PageProps<"/admin/applications">) {
  await requireRole(["ADMIN", "SUPER_ADMIN"]);
  const { status } = await searchParams;
  const [applications, programs] = await Promise.all([listApplications(), getAllPrograms()]);
  return (
    <>
      <PageHeader
        title="Applications"
        description="Review, approve or reject internship applications."
        actions={
          <a href="/api/admin/export/applications" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <Download aria-hidden /> Export CSV
          </a>
        }
      />
      <DataTable
        caption="Applications"
        searchPlaceholder="Search name, email, college…"
        initialFilters={{ status: typeof status === "string" ? status : "" }}
        filters={[
          { key: "status", label: "Status", options: APPLICATION_STATUSES.map((s) => ({ value: s, label: label(s) })) },
          { key: "program", label: "Program", options: programs.map((p) => ({ value: p.id, label: p.name })) },
        ]}
        columns={[
          { key: "name", header: "Applicant", sortable: true },
          { key: "program", header: "Program", sortable: true },
          { key: "academics", header: "Academics", hideOnMobile: true },
          { key: "date", header: "Applied", sortable: true, hideOnMobile: true },
          { key: "status", header: "Status" },
        ]}
        emptyTitle="No applications yet"
        rows={applications.map((a) => ({
          id: a.id,
          search: `${a.fullName} ${a.email} ${a.phone} ${a.college} ${a.location}`,
          filters: { status: a.status, program: a.programId },
          sort: { name: a.fullName, program: a.programName, date: a.createdAt },
          cells: {
            name: (
              <div>
                <Link href={`/admin/applications/${a.id}`} className="font-semibold underline decoration-2 underline-offset-4 hover:decoration-pink">
                  {a.fullName}
                </Link>
                <p className="text-xs text-muted">{a.email}</p>
                {a.earlyBirdInterest && (
                  <Badge tone="pink" className="mt-1">
                    Early-bird interest
                  </Badge>
                )}
              </div>
            ),
            program: a.programName,
            academics: (
              <span className="text-sm">
                {label(a.degree)} · {a.branch}
                <span className="block text-xs text-muted">
                  {label(a.academicYear)} · {a.college}
                </span>
              </span>
            ),
            date: formatDate(a.createdAt),
            status: <StatusBadge status={a.status} />,
          },
        }))}
      />
    </>
  );
}
