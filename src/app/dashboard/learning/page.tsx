import Link from "next/link";
import { BookOpen, CircleCheck, FileText, HelpCircle, Code2, PlayCircle, Circle } from "lucide-react";

import { Locked, PageHeader, ProgressRing } from "@/components/dashboard/ui";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import { label } from "@/lib/domain/enums";
import { lessonPercent } from "@/lib/domain/progress";
import type { LessonType } from "@/lib/domain/enums";
import { cn } from "@/lib/utils";
import { requireRole } from "@/server/auth/session";
import { getCourses, getLessons, orderLessons } from "@/server/queries/platform";
import { getStudentContext } from "@/server/queries/student";

export const metadata = { title: "Learning" };

const TYPE_ICON: Record<LessonType, typeof BookOpen> = {
  VIDEO: PlayCircle,
  ARTICLE: FileText,
  PDF: FileText,
  QUIZ: HelpCircle,
  REPO: Code2,
};

export default async function LearningPage() {
  const session = await requireRole(["STUDENT"]);
  const ctx = (await getStudentContext(session.uid))!;
  if (!ctx.active || !ctx.enrollment) {
    return (
      <>
        <PageHeader title="Learning" />
        <Locked title="Learning unlocks after enrollment">
          Once your payment is verified and your enrollment is activated, your courses and lessons appear here.
        </Locked>
      </>
    );
  }
  const e = ctx.enrollment;
  const [courses, lessons] = await Promise.all([getCourses(e.programId, true), getLessons(e.programId, true)]);
  const ordered = orderLessons(courses, lessons);
  const done = new Set(e.completedLessonIds);
  const pct = lessonPercent(e.completedLessonIds, ordered.map((l) => l.id));
  const next = ordered.find((l) => !done.has(l.id));

  return (
    <>
      <PageHeader
        kicker={e.programName}
        title="Learning"
        description="Work through your courses module by module. Progress is recorded automatically as you complete lessons."
      />
      {ordered.length === 0 ? (
        <EmptyState icon={<BookOpen />} title="No lessons published yet" description="Your mentors are preparing content. You'll be notified when new lessons go live." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <div className="flex min-w-0 flex-col gap-6">
            {courses.map((course) => {
              const courseLessons = ordered.filter((l) => l.courseId === course.id);
              if (!courseLessons.length) return null;
              return (
                <section key={course.id} className="overflow-hidden rounded-card border-2 border-ink bg-paper shadow-brutal-sm">
                  <div className="border-b-2 border-ink bg-cream-2 px-5 py-4">
                    <h2 className="font-display text-2xl font-extrabold">{course.title}</h2>
                    {course.description && <p className="text-sm text-muted">{course.description}</p>}
                  </div>
                  <div className="flex flex-col divide-y-2 divide-ink/10">
                    {course.modules
                      .slice()
                      .sort((a, b) => a.order - b.order)
                      .map((mod) => {
                        const modLessons = courseLessons.filter((l) => l.moduleId === mod.id);
                        if (!modLessons.length) return null;
                        const modDone = modLessons.filter((l) => done.has(l.id)).length;
                        return (
                          <div key={mod.id} className="p-5">
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <h3 className="font-display text-lg font-extrabold">{mod.title}</h3>
                              <span className="font-mono text-xs text-muted">
                                {modDone}/{modLessons.length}
                              </span>
                            </div>
                            <ol className="flex flex-col gap-2">
                              {modLessons.map((l) => {
                                const Icon = TYPE_ICON[l.type];
                                const complete = done.has(l.id);
                                return (
                                  <li key={l.id}>
                                    <Link
                                      href={`/dashboard/learning/${l.id}`}
                                      className={cn(
                                        "flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 transition hover:border-ink hover:bg-lime-soft",
                                        next?.id === l.id ? "border-ink bg-lime-soft" : "border-ink/15",
                                      )}
                                    >
                                      {complete ? (
                                        <CircleCheck className="size-5 shrink-0 text-green" aria-label="Completed" />
                                      ) : (
                                        <Circle className="size-5 shrink-0 text-muted" aria-label="Not completed" />
                                      )}
                                      <span className="min-w-0 flex-1">
                                        <span className="block truncate font-semibold">{l.title}</span>
                                        {l.summary && <span className="block truncate text-xs text-muted">{l.summary}</span>}
                                      </span>
                                      <Badge tone="cream" className="hidden sm:inline-flex">
                                        <Icon aria-hidden /> {label(l.type)}
                                      </Badge>
                                      {l.durationMinutes > 0 && (
                                        <span className="hidden font-mono text-xs text-muted sm:inline">{l.durationMinutes}m</span>
                                      )}
                                    </Link>
                                  </li>
                                );
                              })}
                            </ol>
                          </div>
                        );
                      })}
                  </div>
                </section>
              );
            })}
          </div>
          <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-card border-2 border-ink bg-paper p-5 shadow-brutal-sm">
              <ProgressRing value={pct} label="Lessons" sublabel={`${ordered.filter((l) => done.has(l.id)).length} of ${ordered.length} completed`} />
            </div>
            {next && (
              <Link href={`/dashboard/learning/${next.id}`} className="rounded-card border-2 border-ink bg-lime p-5 shadow-brutal-sm transition hover:-translate-y-0.5">
                <p className="font-mono text-xs uppercase tracking-wider">Up next</p>
                <p className="mt-1 font-display text-xl font-extrabold">{next.title}</p>
              </Link>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
