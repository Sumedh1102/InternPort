import Link from "next/link";
import { ExternalLink, Trash2 } from "lucide-react";

import { CourseDialog, ResourceDialog } from "@/components/admin/catalog-forms";
import { PageHeader } from "@/components/dashboard/ui";
import { ActionButton } from "@/components/ui/action-button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import { label } from "@/lib/domain/enums";
import { deleteResource } from "@/server/actions/content";
import { deleteCourse } from "@/server/actions/learning";
import { requireRole } from "@/server/auth/session";
import { getAdminOptions } from "@/server/queries/admin";
import { getCourses, getLessons, listResources } from "@/server/queries/platform";

export const metadata = { title: "Courses & resources" };

export default async function AdminCoursesPage() {
  await requireRole(["ADMIN", "SUPER_ADMIN"]);
  const [options, courses, lessons, resources] = await Promise.all([getAdminOptions(), getCourses(), getLessons(), listResources()]);
  return (
    <>
      <PageHeader
        title="Courses & resources"
        description="Courses hold modules; lessons live inside modules. Resources are shared links and files per program or batch."
        actions={
          <>
            <ResourceDialog programs={options.programOptions} batches={options.batchOptions} />
            <CourseDialog programs={options.programOptions} />
          </>
        }
      />
      <div className="flex flex-col gap-8">
        {options.programs.map((program) => {
          const programCourses = courses.filter((c) => c.programId === program.id);
          const programResources = resources.filter((r) => r.programId === program.id);
          return (
            <section key={program.id} aria-labelledby={`p-${program.id}`}>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <h2 id={`p-${program.id}`} className="font-display text-2xl font-extrabold">
                  {program.name}
                </h2>
                <StatusBadge status={program.status} />
              </div>
              {programCourses.length === 0 ? (
                <p className="rounded-2xl border-2 border-dashed border-ink/30 p-4 text-sm text-muted">No courses yet.</p>
              ) : (
                <ul className="grid gap-4 md:grid-cols-2">
                  {programCourses.map((c) => {
                    const count = lessons.filter((l) => l.courseId === c.id).length;
                    return (
                      <li key={c.id} className="rounded-card border-2 border-ink bg-paper p-5 shadow-brutal-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-display text-lg font-extrabold">{c.title}</h3>
                            <p className="text-xs text-muted">
                              {c.modules.length} modules · {count} lessons
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <StatusBadge status={c.status} />
                            <CourseDialog course={c} programs={options.programOptions} />
                            <ActionButton
                              action={deleteCourse.bind(null, c.id)}
                              size="icon-sm"
                              variant="ghost"
                              aria-label={`Delete ${c.title}`}
                              confirm={{ title: `Delete ${c.title}?`, description: "Only possible when the course has no lessons.", danger: true, confirmLabel: "Delete" }}
                            >
                              <Trash2 aria-hidden />
                            </ActionButton>
                          </div>
                        </div>
                        <ol className="mt-3 flex flex-col gap-1 text-sm">
                          {c.modules
                            .slice()
                            .sort((a, b) => a.order - b.order)
                            .map((m) => (
                              <li key={m.id} className="flex justify-between gap-2 rounded-lg bg-cream px-2 py-1">
                                <span>{m.title}</span>
                                <span className="font-mono text-xs text-muted">{lessons.filter((l) => l.courseId === c.id && l.moduleId === m.id).length}</span>
                              </li>
                            ))}
                        </ol>
                        <Link href={`/admin/lessons?course=${c.id}`} className="mt-3 inline-block text-sm font-semibold underline">
                          Manage lessons →
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
              {programResources.length > 0 && (
                <div className="mt-4">
                  <h3 className="mb-2 font-mono text-xs font-semibold uppercase tracking-wider text-muted">Resources</h3>
                  <ul className="flex flex-col gap-2">
                    {programResources.map((r) => (
                      <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 border-ink/15 bg-paper px-3 py-2 text-sm">
                        <span className="flex min-w-0 items-center gap-2">
                          <Badge tone="cream">{label(r.type)}</Badge>
                          <a href={r.url} target="_blank" rel="noreferrer" className="truncate font-semibold underline">
                            {r.title}
                          </a>
                          <ExternalLink className="size-3.5 shrink-0" aria-hidden />
                          {r.batchId && <span className="text-xs text-muted">{options.batches.find((b) => b.id === r.batchId)?.name}</span>}
                        </span>
                        <span className="flex gap-1">
                          <ResourceDialog resource={r} programs={options.programOptions} batches={options.batchOptions} />
                          <ActionButton
                            action={deleteResource.bind(null, r.id)}
                            size="icon-sm"
                            variant="ghost"
                            aria-label={`Delete ${r.title}`}
                            confirm={{ title: `Delete ${r.title}?`, danger: true, confirmLabel: "Delete" }}
                          >
                            <Trash2 aria-hidden />
                          </ActionButton>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          );
        })}
        {options.programs.length === 0 && <EmptyState title="Create a program first" />}
      </div>
    </>
  );
}
