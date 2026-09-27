import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Bot, Code2, ExternalLink, FileText, Link2 } from "lucide-react";

import { MarkCompleteButton, QuizRunner } from "@/components/dashboard/lesson-actions";
import { Locked, MarkdownContent, PageHeader } from "@/components/dashboard/ui";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { label } from "@/lib/domain/enums";
import { cn } from "@/lib/utils";
import { requireRole } from "@/server/auth/session";
import { getCourses, getLessons, orderLessons } from "@/server/queries/platform";
import { getStudentContext } from "@/server/queries/student";

export const metadata = { title: "Lesson" };

/** Only well-known video hosts are embedded; everything else is a plain link. */
function embedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}`;
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = u.searchParams.get("v") ?? u.pathname.split("/embed/")[1];
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (host === "vimeo.com") return `https://player.vimeo.com/video/${u.pathname.split("/").filter(Boolean)[0]}`;
    if (host === "drive.google.com" && u.pathname.includes("/file/d/")) return url.replace(/\/view.*$/, "/preview");
    return null;
  } catch {
    return null;
  }
}

export default async function LessonPage({ params }: PageProps<"/dashboard/learning/[lessonId]">) {
  const { lessonId } = await params;
  const session = await requireRole(["STUDENT"]);
  const ctx = (await getStudentContext(session.uid))!;
  if (!ctx.active || !ctx.enrollment) {
    return <Locked title="Learning unlocks after enrollment" />;
  }
  const e = ctx.enrollment;
  const [courses, lessons] = await Promise.all([getCourses(e.programId, true), getLessons(e.programId, true)]);
  const ordered = orderLessons(courses, lessons);
  const index = ordered.findIndex((l) => l.id === lessonId);
  // Students can only open published lessons of their own program.
  if (index === -1) notFound();
  const lesson = ordered[index]!;
  const prev = ordered[index - 1];
  const next = ordered[index + 1];
  const completed = e.completedLessonIds.includes(lesson.id);
  const course = courses.find((c) => c.id === lesson.courseId);
  const moduleTitle = course?.modules.find((m) => m.id === lesson.moduleId)?.title;
  const video = lesson.videoUrl ? embedUrl(lesson.videoUrl) : null;

  return (
    <>
      <PageHeader
        back={{ href: "/dashboard/learning", label: "All lessons" }}
        kicker={[course?.title, moduleTitle].filter(Boolean).join(" · ")}
        title={lesson.title}
        description={lesson.summary}
        actions={
          <Link href={`/dashboard/assistant?lesson=${lesson.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            <Bot aria-hidden /> Ask AI about this
          </Link>
        }
      />
      <div className="mb-6 flex flex-wrap gap-2">
        <Badge tone="lime">{label(lesson.type)}</Badge>
        {lesson.durationMinutes > 0 && <Badge tone="paper">{lesson.durationMinutes} min</Badge>}
        {completed && <Badge tone="ink">Completed</Badge>}
      </div>

      <div className="flex flex-col gap-6">
        {lesson.videoUrl && (
          <section aria-label="Video">
            {video ? (
              <div className="aspect-video overflow-hidden rounded-card border-2 border-ink bg-ink shadow-brutal">
                <iframe
                  src={video}
                  title={lesson.title}
                  className="size-full"
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>
            ) : (
              <a href={lesson.videoUrl} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "dark" })}>
                Watch video <ExternalLink aria-hidden />
              </a>
            )}
          </section>
        )}

        {lesson.content && (
          <section className="rounded-card border-2 border-ink bg-paper p-5 shadow-brutal-sm sm:p-8">
            <MarkdownContent>{lesson.content}</MarkdownContent>
          </section>
        )}

        {(lesson.pdfUrl || lesson.repoUrl || lesson.resources.length > 0) && (
          <section className="rounded-card border-2 border-ink bg-cream-2 p-5">
            <h2 className="mb-3 font-display text-lg font-extrabold">Materials</h2>
            <ul className="flex flex-col gap-2">
              {lesson.pdfUrl && (
                <li>
                  <a href={lesson.pdfUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-semibold underline">
                    <FileText className="size-4" aria-hidden /> Lesson PDF
                  </a>
                </li>
              )}
              {lesson.repoUrl && (
                <li>
                  <a href={lesson.repoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-semibold underline">
                    <Code2 className="size-4" aria-hidden /> Code repository
                  </a>
                </li>
              )}
              {lesson.resources.map((r) => (
                <li key={r.url}>
                  <a href={r.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-semibold underline">
                    <Link2 className="size-4" aria-hidden /> {r.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {lesson.type === "QUIZ" && lesson.quiz?.length ? (
          <section className="rounded-card border-2 border-ink bg-cream p-5 sm:p-6" aria-label="Quiz">
            <h2 className="mb-4 font-display text-2xl font-extrabold">Quiz</h2>
            <QuizRunner lessonId={lesson.id} questions={lesson.quiz} passPercent={lesson.quizPassPercent ?? 60} completed={completed} />
          </section>
        ) : (
          <div>
            <MarkCompleteButton lessonId={lesson.id} completed={completed} />
          </div>
        )}

        <nav aria-label="Lesson navigation" className="flex flex-wrap justify-between gap-3 border-t-2 border-dashed border-ink/30 pt-5">
          {prev ? (
            <Link href={`/dashboard/learning/${prev.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "max-w-full")}>
              <ArrowLeft aria-hidden /> <span className="truncate">{prev.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link href={`/dashboard/learning/${next.id}`} className={cn(buttonVariants({ size: "sm" }), "max-w-full")}>
              <span className="truncate">{next.title}</span> <ArrowRight aria-hidden />
            </Link>
          )}
        </nav>
      </div>
    </>
  );
}
