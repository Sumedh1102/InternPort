import { Code2, ExternalLink, FileText, Library, Link2, PlayCircle } from "lucide-react";

import { Locked, PageHeader } from "@/components/dashboard/ui";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import { label, type ResourceType } from "@/lib/domain/enums";
import { requireRole } from "@/server/auth/session";
import { getResourcesForEnrollment } from "@/server/queries/platform";
import { getStudentContext } from "@/server/queries/student";

export const metadata = { title: "Resources" };

const ICONS: Record<ResourceType, typeof Link2> = {
  LINK: Link2,
  PDF: FileText,
  VIDEO: PlayCircle,
  REPO: Code2,
  DOC: FileText,
};

export default async function ResourcesPage() {
  const session = await requireRole(["STUDENT"]);
  const ctx = (await getStudentContext(session.uid))!;
  if (!ctx.active || !ctx.enrollment) {
    return (
      <>
        <PageHeader title="Resources" />
        <Locked title="Resources unlock after enrollment" />
      </>
    );
  }
  const resources = await getResourcesForEnrollment(ctx.enrollment);
  return (
    <>
      <PageHeader title="Resources" description="Reference material, templates and links shared by your program team." />
      {resources.length === 0 ? (
        <EmptyState icon={<Library />} title="No resources yet" description="Resources shared by your mentors will appear here." />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((r) => {
            const Icon = ICONS[r.type];
            return (
              <li key={r.id}>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-full flex-col gap-3 rounded-card border-2 border-ink bg-paper p-5 shadow-brutal-sm transition hover:-translate-y-0.5 hover:bg-lime-soft"
                >
                  <div className="flex items-center justify-between">
                    <span className="grid size-10 place-items-center rounded-xl border-2 border-ink bg-cream">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <Badge tone="cream">{label(r.type)}</Badge>
                  </div>
                  <h2 className="font-display text-lg font-extrabold">{r.title}</h2>
                  {r.description && <p className="text-sm text-ink-2">{r.description}</p>}
                  <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold">
                    Open <ExternalLink className="size-3.5" aria-hidden />
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
