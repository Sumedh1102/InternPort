import { Megaphone, Pin } from "lucide-react";

import { MarkdownContent, PageHeader } from "@/components/dashboard/ui";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import { formatDateTime } from "@/lib/utils";
import { requireRole } from "@/server/auth/session";
import { announcementsFor, listAnnouncements } from "@/server/queries/platform";
import { getStudentContext } from "@/server/queries/student";

export const metadata = { title: "Announcements" };

export default async function AnnouncementsPage() {
  const session = await requireRole(["STUDENT"]);
  const ctx = (await getStudentContext(session.uid))!;
  const activeEnrollments = ctx.enrollments.filter((e) => e.status === "ACTIVE" || e.status === "COMPLETED");
  const list = announcementsFor(await listAnnouncements(), {
    role: "STUDENT",
    programIds: activeEnrollments.map((e) => e.programId),
    batchIds: activeEnrollments.map((e) => e.batchId ?? "").filter(Boolean),
  });
  return (
    <>
      <PageHeader title="Announcements" description="Updates from Sainam Technology and your mentors." />
      {list.length === 0 ? (
        <EmptyState icon={<Megaphone />} title="No announcements yet" />
      ) : (
        <ul className="flex flex-col gap-4">
          {list.map((a) => (
            <li key={a.id} className={`rounded-card border-2 border-ink p-5 shadow-brutal-sm sm:p-6 ${a.pinned ? "bg-pink-soft" : "bg-paper"}`}>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {a.pinned && (
                  <Badge tone="pink">
                    <Pin aria-hidden /> Pinned
                  </Badge>
                )}
                <span className="font-mono text-xs text-muted">
                  {a.authorName} · {formatDateTime(a.createdAt)}
                </span>
              </div>
              <h2 className="font-display text-xl font-extrabold">{a.title}</h2>
              <MarkdownContent className="mt-2 text-sm">{a.body}</MarkdownContent>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
