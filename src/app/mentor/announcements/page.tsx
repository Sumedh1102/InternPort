import { PageHeader } from "@/components/dashboard/ui";
import { AnnouncementFormDialog } from "@/components/staff/announcement-form";
import { AnnouncementList } from "@/components/staff/announcement-list";
import { requireRole } from "@/server/auth/session";
import { listAnnouncements } from "@/server/queries/platform";
import { getMentorContext } from "@/server/queries/mentor";

export const metadata = { title: "Announcements" };

export default async function MentorAnnouncementsPage() {
  const session = await requireRole(["MENTOR"]);
  const ctx = await getMentorContext(session.uid);
  const all = await listAnnouncements();
  const programIds = new Set(ctx.batches.map((b) => b.programId));
  const visible = all.filter(
    (a) =>
      a.audience === "ALL" ||
      a.audience === "MENTORS" ||
      (a.audience === "PROGRAM" && programIds.has(a.programId ?? "")) ||
      (a.audience === "BATCH" && ctx.batchIds.includes(a.batchId ?? "")),
  );
  const batches = ctx.batches.map((b) => ({ id: b.id, name: `${b.name} · ${b.programName}`, programId: b.programId }));
  const programs = [...programIds].map((id) => ({ id, name: ctx.programs.get(id)?.name ?? id }));
  return (
    <>
      <PageHeader
        title="Announcements"
        description="Post updates to your batches. Admin announcements for mentors and everyone also appear here."
        actions={batches.length ? <AnnouncementFormDialog programs={programs} batches={batches} mentorMode /> : undefined}
      />
      <AnnouncementList
        announcements={visible}
        programs={programs}
        batches={batches}
        mentorMode
        canEdit={(a) => a.authorId === session.uid}
      />
    </>
  );
}
