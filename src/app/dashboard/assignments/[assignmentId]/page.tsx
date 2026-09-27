import Link from "next/link";
import { notFound } from "next/navigation";
import { Bot, CalendarClock, Paperclip, Trophy } from "lucide-react";

import { SubmissionForm } from "@/components/forms/submission-form";
import { DashboardCard, Locked, MarkdownContent, PageHeader } from "@/components/dashboard/ui";
import { StatusBadge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { formatBytes, formatDateTime, relativeTime } from "@/lib/utils";
import { requireRole } from "@/server/auth/session";
import { getAssignment, getSubmission, submissionId } from "@/server/queries/platform";
import { getStudentContext } from "@/server/queries/student";

export const metadata = { title: "Assignment" };

export default async function AssignmentDetailPage({ params }: PageProps<"/dashboard/assignments/[assignmentId]">) {
  const { assignmentId } = await params;
  const session = await requireRole(["STUDENT"]);
  const ctx = (await getStudentContext(session.uid))!;
  if (!ctx.active || !ctx.enrollment) return <Locked title="Assignments unlock after enrollment" />;
  const e = ctx.enrollment;

  const assignment = await getAssignment(assignmentId);
  if (
    !assignment ||
    assignment.status !== "PUBLISHED" ||
    assignment.programId !== e.programId ||
    (assignment.batchId && assignment.batchId !== e.batchId)
  ) {
    notFound();
  }
  const submission = await getSubmission(submissionId(assignment.id, session.uid));
  const status = submission?.status ?? "NOT_STARTED";
  const locked = status === "SUBMITTED" || status === "UNDER_REVIEW" || status === "APPROVED";
  const overdue = new Date(assignment.dueDate).getTime() < Date.now();

  return (
    <>
      <PageHeader
        back={{ href: "/dashboard/assignments", label: "All assignments" }}
        title={assignment.title}
        actions={
          <Link href={`/dashboard/assistant?assignment=${assignment.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            <Bot aria-hidden /> Ask AI for a hint
          </Link>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex min-w-0 flex-col gap-6">
          <section className="rounded-card border-2 border-ink bg-paper p-5 shadow-brutal-sm sm:p-6">
            <MarkdownContent>{assignment.description}</MarkdownContent>
            {assignment.instructions && (
              <>
                <h2 className="mt-6 font-display text-xl font-extrabold">Instructions</h2>
                <MarkdownContent className="mt-2">{assignment.instructions}</MarkdownContent>
              </>
            )}
            {assignment.attachments.length > 0 && (
              <ul className="mt-6 flex flex-col gap-2">
                {assignment.attachments.map((f) => (
                  <li key={f.path}>
                    <a href={f.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold underline">
                      <Paperclip className="size-4" aria-hidden /> {f.name}
                      <span className="font-mono text-xs text-muted">{formatBytes(f.size)}</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-card border-2 border-ink bg-cream-2 p-5 sm:p-6" aria-labelledby="your-submission">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 id="your-submission" className="font-display text-2xl font-extrabold">
                Your submission
              </h2>
              <StatusBadge status={status} />
            </div>
            {status === "REVISION_REQUIRED" && (
              <Alert tone="warning" title="Your mentor requested changes" className="mb-4">
                Update your work below and submit again.
              </Alert>
            )}
            {locked && (
              <Alert tone="info" className="mb-4">
                {status === "APPROVED"
                  ? "This submission was approved. Great work!"
                  : "Submitted — your mentor will review it soon. You'll be notified when there's feedback."}
              </Alert>
            )}
            <SubmissionForm
              assignmentId={assignment.id}
              uid={session.uid}
              submission={submission}
              allowFiles={assignment.allowFileUpload}
              locked={locked}
            />
          </section>
        </div>

        <aside className="flex flex-col gap-4">
          <DashboardCard title="Deadline" icon={<CalendarClock />} tone={overdue && !locked ? "pink-soft" : "paper"}>
            <p className="font-semibold">{formatDateTime(assignment.dueDate)}</p>
            <p className="text-sm text-muted">{overdue ? "Past due — late submissions are marked late." : relativeTime(assignment.dueDate)}</p>
          </DashboardCard>
          <DashboardCard title="Score & feedback" icon={<Trophy />} tone={status === "APPROVED" ? "lime" : "paper"}>
            {typeof submission?.score === "number" ? (
              <p className="font-display text-4xl font-extrabold">
                {submission.score}
                <span className="text-lg text-muted">/{assignment.maxScore}</span>
              </p>
            ) : (
              <p className="text-sm text-muted">Max score: {assignment.maxScore}. Not scored yet.</p>
            )}
            {submission?.feedback && (
              <div className="mt-3 rounded-xl border-2 border-ink/20 bg-paper p-3 text-sm">
                <p className="mb-1 font-semibold">{submission.reviewedByName ?? "Mentor"} wrote:</p>
                <p className="whitespace-pre-wrap">{submission.feedback}</p>
              </div>
            )}
          </DashboardCard>
        </aside>
      </div>
    </>
  );
}
