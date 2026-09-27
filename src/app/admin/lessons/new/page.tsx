import { LessonForm } from "@/components/admin/lesson-form";
import { PageHeader } from "@/components/dashboard/ui";
import { EmptyState } from "@/components/ui/feedback";
import { requireRole } from "@/server/auth/session";
import { getCourses } from "@/server/queries/platform";
import { getAllPrograms } from "@/server/queries/programs";

export const metadata = { title: "New lesson" };

export default async function NewLessonPage() {
  await requireRole(["ADMIN", "SUPER_ADMIN"]);
  const [courses, programs] = await Promise.all([getCourses(), getAllPrograms()]);
  return (
    <>
      <PageHeader back={{ href: "/admin/lessons", label: "Lessons" }} title="New lesson" />
      {courses.length ? (
        <LessonForm courses={courses} programNames={Object.fromEntries(programs.map((p) => [p.id, p.name]))} />
      ) : (
        <EmptyState title="Create a course first" description="Lessons belong to a course module." />
      )}
    </>
  );
}
