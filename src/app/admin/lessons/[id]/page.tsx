import { notFound } from "next/navigation";

import { LessonForm } from "@/components/admin/lesson-form";
import { PageHeader } from "@/components/dashboard/ui";
import { StatusBadge } from "@/components/ui/badge";
import { requireRole } from "@/server/auth/session";
import { getCourses, getLesson, getLessonAnswerKey } from "@/server/queries/platform";
import { getAllPrograms } from "@/server/queries/programs";

export const metadata = { title: "Edit lesson" };

export default async function EditLessonPage({ params }: PageProps<"/admin/lessons/[id]">) {
  await requireRole(["ADMIN", "SUPER_ADMIN"]);
  const { id } = await params;
  const [lesson, courses, programs] = await Promise.all([getLesson(id), getCourses(), getAllPrograms()]);
  if (!lesson) notFound();
  const answerKey = lesson.type === "QUIZ" ? await getLessonAnswerKey(lesson.id) : [];
  return (
    <>
      <PageHeader back={{ href: "/admin/lessons", label: "Lessons" }} title={lesson.title} actions={<StatusBadge status={lesson.status} />} />
      <LessonForm lesson={lesson} answerKey={answerKey} courses={courses} programNames={Object.fromEntries(programs.map((p) => [p.id, p.name]))} />
    </>
  );
}
