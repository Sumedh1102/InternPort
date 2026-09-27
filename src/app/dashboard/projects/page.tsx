import { FolderGit2 } from "lucide-react";

import { ProjectSubmitForm } from "@/components/forms/project-submit-form";
import { ProjectStepper } from "@/components/dashboard/project-stepper";
import { Locked, PageHeader } from "@/components/dashboard/ui";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import { formatDate } from "@/lib/utils";
import { requireRole } from "@/server/auth/session";
import { getProjectsForUser } from "@/server/queries/platform";
import { getStudentContext } from "@/server/queries/student";

export const metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const session = await requireRole(["STUDENT"]);
  const ctx = (await getStudentContext(session.uid))!;
  if (!ctx.active) {
    return (
      <>
        <PageHeader title="Projects" />
        <Locked title="Projects unlock after enrollment" />
      </>
    );
  }
  const projects = await getProjectsForUser(session.uid);
  return (
    <>
      <PageHeader title="Projects" description="Your mentor assigns your project. Build it, push it to GitHub and submit it for review." />
      {projects.length === 0 ? (
        <EmptyState icon={<FolderGit2 />} title="No project assigned yet" description="Your mentor will assign your internship project. You'll get a notification when it's ready." />
      ) : (
        <div className="flex flex-col gap-6">
          {projects.map((p) => {
            const locked = p.status === "SUBMITTED" || p.status === "EVALUATED" || p.status === "COMPLETED";
            return (
              <article key={p.id} className="rounded-card border-2 border-ink bg-paper p-5 shadow-brutal-sm sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-display text-2xl font-extrabold">{p.title}</h2>
                    <p className="text-sm text-muted">
                      {p.programName}
                      {p.dueDate ? ` · Due ${formatDate(p.dueDate)}` : ""}
                    </p>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
                <p className="mt-3 whitespace-pre-line text-ink-2">{p.description}</p>
                {p.techStack.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {p.techStack.map((t) => (
                      <Badge key={t} tone="cream">
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="mt-5">
                  <ProjectStepper status={p.status} />
                </div>
                {(typeof p.score === "number" || p.feedback) && (
                  <div className="mt-5 rounded-2xl border-2 border-ink bg-lime-soft p-4">
                    {typeof p.score === "number" && (
                      <p className="font-display text-2xl font-extrabold">
                        {p.score}
                        <span className="text-base text-muted">/{p.maxScore}</span>
                      </p>
                    )}
                    {p.feedback && <p className="mt-1 whitespace-pre-wrap text-sm">{p.feedback}</p>}
                  </div>
                )}
                <div className="mt-5 border-t-2 border-dashed border-ink/25 pt-5">
                  <ProjectSubmitForm project={p} uid={session.uid} locked={locked} />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
