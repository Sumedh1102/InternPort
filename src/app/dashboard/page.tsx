import Link from "next/link";
import {
  ArrowRight,
  Award,
  BookOpen,
  CalendarCheck,
  CalendarClock,
  ClipboardList,
  FolderGit2,
  Megaphone,
  PlayCircle,
  Sparkles,
  Video,
} from "lucide-react";

import { Sparkle, StickerLabel } from "@/components/brand/decor";
import { ApplicationTracker } from "@/components/dashboard/application-tracker";
import { InsightsCard } from "@/components/dashboard/insights-card";
import { DashboardCard, PageHeader, ProgressCard, ProgressRing } from "@/components/dashboard/ui";
import { StatusBadge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, Stat } from "@/components/ui/feedback";
import type { Submission } from "@/lib/domain/types";
import { SITE } from "@/lib/site";
import { cn, firstName, formatDate, formatDateTime, relativeTime } from "@/lib/utils";
import { requireRole } from "@/server/auth/session";
import { eligibilityFor, metricsForEnrollment } from "@/server/metrics";
import {
  announcementsFor,
  getAssignmentsForEnrollment,
  getCertificatesForUser,
  getCourses,
  getLessons,
  getNotifications,
  getProjectsForUser,
  getSessionsForBatches,
  getSubmissionsForUser,
  listAnnouncements,
  orderLessons,
} from "@/server/queries/platform";
import { getSettings } from "@/server/queries/settings";
import { getStudentContext } from "@/server/queries/student";

export const metadata = { title: "Overview" };

export default async function StudentOverview() {
  const session = await requireRole(["STUDENT"]);
  const ctx = (await getStudentContext(session.uid))!;
  const { user, enrollment, application, active } = ctx;

  const header = (
    <PageHeader
      kicker={SITE.program}
      title={`Hey ${firstName(user.name)} 👋`}
      description={active ? "Here's where you are and what's next." : "Welcome to your Sainam Technology dashboard."}
    />
  );

  // ---------- Not yet enrolled ----------
  if (!active) {
    return (
      <>
        {header}
        {application ? (
          <div className="flex flex-col gap-6">
            <ApplicationTracker application={application} enrollment={enrollment} />
            {ctx.applications.length > 1 && (
              <DashboardCard title="All applications">
                <ul className="flex flex-col gap-2">
                  {ctx.applications.map((a) => (
                    <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 border-ink/15 px-3 py-2 text-sm">
                      <span className="font-semibold">{a.programName}</span>
                      <span className="flex items-center gap-2 text-muted">
                        {formatDate(a.createdAt)} <StatusBadge status={a.status} />
                      </span>
                    </li>
                  ))}
                </ul>
              </DashboardCard>
            )}
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-chunk border-2 border-ink bg-lime p-6 shadow-brutal-lg sm:p-10">
            <Sparkle className="absolute right-6 top-6 size-12 text-paper" />
            <StickerLabel tone="ink">{SITE.program}</StickerLabel>
            <h2 className="font-display-wide mt-4 max-w-2xl text-4xl leading-[0.95] sm:text-5xl">
              Start your internship journey.
            </h2>
            <p className="mt-3 max-w-xl">
              Pick a domain, submit your application and track every step — approval, payment verification and
              enrollment — right here.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/apply" className={buttonVariants({ variant: "dark", size: "lg" })}>
                Apply now <ArrowRight aria-hidden />
              </Link>
              <Link href="/internships" className={buttonVariants({ variant: "outline", size: "lg" })}>
                Browse programs
              </Link>
            </div>
          </div>
        )}
      </>
    );
  }

  // ---------- Active / completed enrollment ----------
  const e = enrollment!;
  const [metrics, courses, lessons, assignments, submissions, projects, sessions, certificates, settings, announcements, notifications] =
    await Promise.all([
      metricsForEnrollment(e),
      getCourses(e.programId, true),
      getLessons(e.programId, true),
      getAssignmentsForEnrollment(e),
      getSubmissionsForUser(session.uid),
      getProjectsForUser(session.uid),
      e.batchId ? getSessionsForBatches([e.batchId]) : Promise.resolve([]),
      getCertificatesForUser(session.uid),
      getSettings(),
      listAnnouncements(),
      getNotifications(session.uid, 5),
    ]);

  const ordered = orderLessons(courses, lessons);
  const done = new Set(e.completedLessonIds);
  const nextLesson = ordered.find((l) => !done.has(l.id));
  const now = Date.now();
  const upcoming = sessions
    .filter((s) => s.status === "SCHEDULED" && new Date(s.startAt).getTime() + s.durationMinutes * 60e3 > now)
    .slice(0, 3);
  const subByAssignment = new Map<string, Submission>(submissions.map((s) => [s.assignmentId, s]));
  const openAssignments = assignments
    .filter((a) => {
      const st = subByAssignment.get(a.id)?.status;
      return !st || st === "IN_PROGRESS" || st === "REVISION_REQUIRED";
    })
    .slice(0, 4);
  const project = projects.find((p) => p.enrollmentId === e.id);
  const certificate = certificates.find((c) => c.enrollmentId === e.id);
  const eligibility = eligibilityFor(e, metrics, settings.certificate);
  const pinned = announcementsFor(announcements, {
    role: "STUDENT",
    programIds: [e.programId],
    batchIds: e.batchId ? [e.batchId] : [],
  }).slice(0, 2);

  return (
    <>
      {header}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Program + progress */}
        <section className="relative overflow-hidden rounded-card border-2 border-ink bg-ink p-6 text-paper shadow-brutal-lime lg:col-span-2">
          <div aria-hidden className="bg-grid-dark absolute inset-0" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2">
              <StatusBadge status={e.status} />
              <h2 className="font-display-wide text-3xl sm:text-4xl">{e.programName}</h2>
              <p className="text-sm text-paper/75">
                {e.batchName ?? "Batch to be assigned"}
                {e.mentorName ? ` · Mentor: ${e.mentorName}` : ""}
              </p>
              {e.startDate && (
                <p className="font-mono text-xs text-paper/60">
                  {formatDate(e.startDate)} → {formatDate(e.endDate)}
                </p>
              )}
            </div>
            <div className="rounded-2xl bg-paper p-3 text-ink">
              <ProgressRing value={metrics.overall} label="Overall" sublabel="progress" />
            </div>
          </div>
          <div className="relative mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ProgressCard title="Lessons" value={metrics.lessonPercent} detail={`${metrics.lessonsCompleted}/${metrics.lessonsTotal} completed`} />
            <ProgressCard title="Assignments" value={metrics.assignmentPercent} detail={`${metrics.assignmentsApproved}/${metrics.assignmentsTotal} approved`} tone="pink" />
            <ProgressCard title="Attendance" value={metrics.attendancePercent} detail={metrics.has.attendance ? `${metrics.sessionsAttended}/${metrics.sessionsRecorded} sessions` : "No sessions yet"} tone="cyan" />
            <ProgressCard title="Project" value={metrics.projectPercent} detail={project ? project.title : "Not assigned yet"} />
          </div>
        </section>

        {/* Next lesson */}
        <DashboardCard title="Next lesson" icon={<BookOpen />} href="/dashboard/learning" tone="lime">
          {nextLesson ? (
            <div className="flex h-full flex-col gap-3">
              <p className="font-mono text-xs uppercase tracking-wider">{nextLesson.type}</p>
              <h3 className="font-display text-2xl font-extrabold leading-tight">{nextLesson.title}</h3>
              {nextLesson.summary && <p className="text-sm">{nextLesson.summary}</p>}
              <Link href={`/dashboard/learning/${nextLesson.id}`} className={cn(buttonVariants({ variant: "dark" }), "mt-auto self-start")}>
                <PlayCircle aria-hidden /> Continue
              </Link>
            </div>
          ) : ordered.length ? (
            <p className="font-semibold">🎉 You&apos;ve completed every published lesson. New ones will appear here.</p>
          ) : (
            <p className="text-sm">Lessons for your program will appear here as soon as they&apos;re published.</p>
          )}
        </DashboardCard>

        {/* Upcoming sessions */}
        <DashboardCard title="Upcoming sessions" icon={<CalendarClock />} href="/dashboard/attendance">
          {upcoming.length ? (
            <ul className="flex flex-col gap-3">
              {upcoming.map((s) => (
                <li key={s.id} className="flex items-start justify-between gap-3 rounded-xl border-2 border-ink/15 p-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{s.title}</p>
                    <p className="text-xs text-muted">{formatDateTime(s.startAt)} · {s.durationMinutes} min</p>
                  </div>
                  {s.meetingUrl && (
                    <a href={s.meetingUrl} target="_blank" rel="noreferrer" className={buttonVariants({ size: "sm", variant: "outline" })}>
                      <Video aria-hidden /> Join
                    </a>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No sessions scheduled right now.</p>
          )}
        </DashboardCard>

        {/* Assignments */}
        <DashboardCard title="Assignments" icon={<ClipboardList />} href="/dashboard/assignments">
          {openAssignments.length ? (
            <ul className="flex flex-col gap-3">
              {openAssignments.map((a) => {
                const sub = subByAssignment.get(a.id);
                const overdue = new Date(a.dueDate).getTime() < now;
                return (
                  <li key={a.id}>
                    <Link href={`/dashboard/assignments/${a.id}`} className="flex items-start justify-between gap-3 rounded-xl border-2 border-ink/15 p-3 transition hover:border-ink hover:bg-lime-soft">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{a.title}</p>
                        <p className={cn("text-xs", overdue ? "font-semibold text-red" : "text-muted")}>
                          {overdue ? "Overdue · " : "Due "}
                          {relativeTime(a.dueDate)}
                        </p>
                      </div>
                      <StatusBadge status={sub?.status ?? "NOT_STARTED"} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted">{assignments.length ? "All caught up — nothing pending. ✅" : "No assignments published yet."}</p>
          )}
        </DashboardCard>

        {/* Project + attendance + certificate */}
        <div className="grid gap-6">
          <DashboardCard title="Project" icon={<FolderGit2 />} href="/dashboard/projects">
            {project ? (
              <div className="flex flex-col gap-2">
                <p className="font-semibold">{project.title}</p>
                <StatusBadge status={project.status} />
              </div>
            ) : (
              <p className="text-sm text-muted">Your mentor will assign your project.</p>
            )}
          </DashboardCard>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-3 lg:grid-cols-4">
          <Stat label="Attendance" value={metrics.has.attendance ? `${metrics.attendancePercent}%` : "—"} hint={`${metrics.sessionsAttended} attended`} icon={<CalendarCheck />} />
          <Stat label="Avg. score" value={metrics.averageScore !== null ? `${metrics.averageScore}%` : "—"} hint="Across evaluated work" icon={<Sparkles />} />
          <Stat label="Overdue" value={metrics.assignmentsOverdue} hint="assignments past due" tone={metrics.assignmentsOverdue ? "pink" : "paper"} />
          <Stat
            label="Certificate"
            value={certificate ? "Issued" : eligibility.eligible ? "Eligible" : "In progress"}
            hint={certificate ? certificate.certificateId : `${eligibility.checks.filter((c) => c.pass).length}/${eligibility.checks.length} criteria met`}
            tone={certificate ? "lime" : "paper"}
            icon={<Award />}
          />
        </div>

        <InsightsCard initial={e.insights ?? null} className="lg:col-span-2" />

        <div className="flex flex-col gap-6">
          <DashboardCard title="Notifications" href="/dashboard/notifications">
            {notifications.length ? (
              <ul className="flex flex-col gap-2.5">
                {notifications.map((n) => (
                  <li key={n.id} className="text-sm">
                    <p className={cn("font-semibold", !n.read && "before:mr-1.5 before:inline-block before:size-2 before:rounded-full before:bg-pink")}>{n.title}</p>
                    <p className="line-clamp-1 text-xs text-muted">{n.body}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No notifications yet.</p>
            )}
          </DashboardCard>
          {pinned.length > 0 && (
            <DashboardCard title="Announcements" icon={<Megaphone />} href="/dashboard/announcements" tone="pink-soft">
              <ul className="flex flex-col gap-3">
                {pinned.map((a) => (
                  <li key={a.id}>
                    <p className="font-semibold">{a.title}</p>
                    <p className="line-clamp-2 text-sm text-ink-2">{a.body}</p>
                  </li>
                ))}
              </ul>
            </DashboardCard>
          )}
        </div>
      </div>
      {!ordered.length && !assignments.length && (
        <EmptyState className="mt-6" title="Your program content is on its way" description="Mentors are publishing lessons and assignments for your batch." />
      )}
    </>
  );
}
