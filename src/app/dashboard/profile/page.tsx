import { Award, FileSearch, FolderGit2 } from "lucide-react";

import { Github, Linkedin } from "@/components/brand/icons";
import { ProfileForm } from "@/components/forms/profile-form";
import { DashboardCard, PageHeader, ProgressRing } from "@/components/dashboard/ui";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/feedback";
import { label } from "@/lib/domain/enums";
import { requireRole } from "@/server/auth/session";
import { metricsForEnrollment } from "@/server/metrics";
import { getCertificatesForUser, getProjectsForUser } from "@/server/queries/platform";
import { getStudentContext } from "@/server/queries/student";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const session = await requireRole(["STUDENT"]);
  const ctx = (await getStudentContext(session.uid))!;
  const { user, enrollment } = ctx;
  const [projects, certificates, metrics] = await Promise.all([
    getProjectsForUser(session.uid),
    getCertificatesForUser(session.uid),
    ctx.active && enrollment ? metricsForEnrollment(enrollment) : Promise.resolve(null),
  ]);

  return (
    <>
      <PageHeader title="Profile" description="Your digital student profile and account details." />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="min-w-0">
          <ProfileForm user={user} mode="profile" />
        </div>
        <aside className="flex flex-col gap-6">
          {/* Digital profile preview */}
          <section className="overflow-hidden rounded-card border-2 border-ink bg-paper shadow-brutal" aria-label="Digital profile">
            <div className="bg-grid-sm flex items-center gap-4 border-b-2 border-ink bg-lime p-5">
              <Avatar name={user.name} src={user.profileImage} size={64} />
              <div className="min-w-0">
                <p className="truncate font-display text-xl font-extrabold">{user.name}</p>
                <p className="truncate text-sm">{enrollment?.programName ?? "Aspiring intern"}</p>
                <p className="truncate text-xs">
                  {[label(user.degree ?? ""), user.branch, user.college].filter((v) => v && v !== "—").join(" · ")}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-4 p-5">
              {metrics && <ProgressRing value={metrics.overall} size={84} label="Program progress" sublabel={`${metrics.lessonsCompleted} lessons completed`} />}
              {user.skills?.length ? (
                <div>
                  <p className="mb-2 font-mono text-xs font-semibold uppercase tracking-wider text-muted">Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {user.skills.map((s) => (
                      <Badge key={s} tone="cream">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
              <div>
                <p className="mb-2 flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-muted">
                  <FolderGit2 className="size-3.5" aria-hidden /> Projects
                </p>
                {projects.length ? (
                  <ul className="flex flex-col gap-1.5 text-sm">
                    {projects.map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-2">
                        <span className="truncate font-semibold">{p.title}</span>
                        <StatusBadge status={p.status} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted">No projects yet.</p>
                )}
              </div>
              <div>
                <p className="mb-2 flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-muted">
                  <Award className="size-3.5" aria-hidden /> Certificates & achievements
                </p>
                {certificates.length ? (
                  <ul className="flex flex-col gap-1.5 text-sm">
                    {certificates.map((c) => (
                      <li key={c.id} className="font-semibold">
                        {c.programName} <span className="font-mono text-xs text-muted">{c.certificateId}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted">Complete your program to earn a certificate.</p>
                )}
              </div>
              {(user.github || user.linkedin) && (
                <div className="flex gap-2">
                  {user.github && (
                    <a href={user.github} target="_blank" rel="noreferrer" className="grid size-9 place-items-center rounded-full border-2 border-ink hover:bg-lime" aria-label="GitHub profile">
                      <Github className="size-4" />
                    </a>
                  )}
                  {user.linkedin && (
                    <a href={user.linkedin} target="_blank" rel="noreferrer" className="grid size-9 place-items-center rounded-full border-2 border-ink hover:bg-lime" aria-label="LinkedIn profile">
                      <Linkedin className="size-4" />
                    </a>
                  )}
                </div>
              )}
              <p className="text-xs text-muted">A shareable public profile page is planned for a future release.</p>
            </div>
          </section>

          <DashboardCard title="AI resume review" icon={<FileSearch />} tone="cyan-soft" action={<Badge tone="ink">Coming soon</Badge>}>
            <p className="text-sm">
              Soon you&apos;ll be able to get AI suggestions on your resume — skills, projects, structure and gaps — based on
              what you&apos;ve built during the internship. It won&apos;t make hiring predictions.
            </p>
          </DashboardCard>
        </aside>
      </div>
    </>
  );
}
