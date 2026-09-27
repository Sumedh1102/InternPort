import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/dashboard/ui";
import { ActionButton } from "@/components/ui/action-button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { CONTENT_STATUSES, LESSON_TYPES, label } from "@/lib/domain/enums";
import { deleteLesson } from "@/server/actions/learning";
import { requireRole } from "@/server/auth/session";
import { getCourses, getLessons } from "@/server/queries/platform";
import { getAllPrograms } from "@/server/queries/programs";

export const metadata = { title: "Lessons" };

export default async function AdminLessonsPage({ searchParams }: PageProps<"/admin/lessons">) {
  await requireRole(["ADMIN", "SUPER_ADMIN"]);
  const { course } = await searchParams;
  const [programs, courses, lessons] = await Promise.all([getAllPrograms(), getCourses(), getLessons()]);
  const courseById = new Map(courses.map((c) => [c.id, c]));
  const programName = new Map(programs.map((p) => [p.id, p.name]));
  return (
    <>
      <PageHeader
        title="Lessons"
        description="Videos, notes, PDFs, quizzes and code repos. Student progress is calculated from published lessons."
        actions={
          courses.length ? (
            <Link href="/admin/lessons/new" className={buttonVariants({ size: "sm" })}>
              <Plus aria-hidden /> New lesson
            </Link>
          ) : (
            <Link href="/admin/courses" className={buttonVariants({ size: "sm", variant: "outline" })}>
              Create a course first
            </Link>
          )
        }
      />
      <DataTable
        caption="Lessons"
        searchPlaceholder="Search lessons…"
        initialFilters={{ course: typeof course === "string" ? course : "" }}
        filters={[
          { key: "course", label: "Course", options: courses.map((c) => ({ value: c.id, label: `${c.title} · ${programName.get(c.programId) ?? ""}` })) },
          { key: "type", label: "Type", options: LESSON_TYPES.map((t) => ({ value: t, label: label(t) })) },
          { key: "status", label: "Status", options: CONTENT_STATUSES.map((s) => ({ value: s, label: label(s) })) },
        ]}
        columns={[
          { key: "title", header: "Lesson", sortable: true },
          { key: "where", header: "Course / module", hideOnMobile: true },
          { key: "type", header: "Type" },
          { key: "status", header: "Status" },
          { key: "actions", header: "" },
        ]}
        emptyTitle="No lessons yet"
        rows={lessons.map((l) => {
          const c = courseById.get(l.courseId);
          const moduleTitle = c?.modules.find((m) => m.id === l.moduleId)?.title;
          return {
            id: l.id,
            search: `${l.title} ${l.summary}`,
            filters: { course: l.courseId, type: l.type, status: l.status },
            sort: { title: l.title },
            cells: {
              title: (
                <Link href={`/admin/lessons/${l.id}`} className="font-semibold underline decoration-2 underline-offset-4">
                  {l.title}
                </Link>
              ),
              where: (
                <span className="text-sm">
                  {c?.title ?? "—"}
                  <span className="block text-xs text-muted">
                    {moduleTitle ?? "—"} · {programName.get(l.programId)}
                  </span>
                </span>
              ),
              type: <Badge tone="cream">{label(l.type)}</Badge>,
              status: <StatusBadge status={l.status} />,
              actions: (
                <div className="flex gap-1">
                  <Link href={`/admin/lessons/${l.id}`} className={buttonVariants({ size: "icon-sm", variant: "ghost" })} aria-label={`Edit ${l.title}`}>
                    <Pencil aria-hidden />
                  </Link>
                  <ActionButton
                    action={deleteLesson.bind(null, l.id)}
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Delete ${l.title}`}
                    confirm={{ title: `Delete ${l.title}?`, description: "Students keep their completion history, but the lesson disappears.", danger: true, confirmLabel: "Delete" }}
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
