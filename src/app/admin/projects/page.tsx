import { Star } from "lucide-react";

import { PageHeader } from "@/components/dashboard/ui";
import { ProjectReviewDialog } from "@/components/staff/review-forms";
import { ActionButton } from "@/components/ui/action-button";
import { StatusBadge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { PROJECT_STATUSES, label } from "@/lib/domain/enums";
import { relativeTime } from "@/lib/utils";
import { setProjectFeatured } from "@/server/actions/projects";
import { requireRole } from "@/server/auth/session";
import { listProjects } from "@/server/queries/platform";

export const metadata = { title: "Projects" };

export default async function AdminProjectsPage() {
  await requireRole(["ADMIN", "SUPER_ADMIN"]);
  const projects = await listProjects();
  return (
    <>
      <PageHeader
        title="Projects"
        description="Assign projects from Students & payments → Active interns. Review, evaluate and feature completed work here."
      />
      <DataTable
        caption="Projects"
        filters={[{ key: "status", label: "Status", options: PROJECT_STATUSES.map((s) => ({ value: s, label: label(s) })) }]}
        columns={[
          { key: "title", header: "Project", sortable: true },
          { key: "student", header: "Student", sortable: true },
          { key: "status", header: "Status" },
          { key: "score", header: "Score", hideOnMobile: true },
          { key: "updated", header: "Updated", sortable: true, hideOnMobile: true },
          { key: "actions", header: "" },
        ]}
        emptyTitle="No projects yet"
        rows={projects.map((p) => ({
          id: p.id,
          search: `${p.title} ${p.studentName} ${p.programName}`,
          filters: { status: p.status },
          sort: { title: p.title, student: p.studentName, updated: p.updatedAt ?? "" },
          cells: {
            title: (
              <div>
                <p className="font-semibold">
                  {p.title} {p.featured && <Star className="inline size-4 fill-lime" aria-label="Featured" />}
                </p>
                <p className="text-xs text-muted">{p.programName}</p>
              </div>
            ),
            student: p.studentName,
            status: <StatusBadge status={p.status} />,
            score: typeof p.score === "number" ? `${p.score}/${p.maxScore}` : "—",
            updated: relativeTime(p.updatedAt),
            actions: (
              <div className="flex flex-wrap gap-1">
                <ProjectReviewDialog project={p} canFeature />
                {(p.status === "COMPLETED" || p.status === "EVALUATED") && (
                  <ActionButton action={setProjectFeatured.bind(null, p.id, !p.featured)} size="sm" variant="ghost">
                    {p.featured ? "Unfeature" : "Feature"}
                  </ActionButton>
                )}
              </div>
            ),
          },
        }))}
      />
    </>
  );
}
