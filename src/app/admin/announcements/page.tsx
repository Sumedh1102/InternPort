import { PageHeader } from "@/components/dashboard/ui";
import { AnnouncementFormDialog } from "@/components/staff/announcement-form";
import { AnnouncementList } from "@/components/staff/announcement-list";
import { requireRole } from "@/server/auth/session";
import { getAdminOptions } from "@/server/queries/admin";
import { listAnnouncements } from "@/server/queries/platform";

export const metadata = { title: "Announcements" };

export default async function AdminAnnouncementsPage() {
  await requireRole(["ADMIN", "SUPER_ADMIN"]);
  const [options, announcements] = await Promise.all([getAdminOptions(), listAnnouncements()]);
  return (
    <>
      <PageHeader
        title="Announcements"
        description="Publish to everyone, a program, a batch or all mentors — with an optional in-app notification."
        actions={<AnnouncementFormDialog programs={options.programOptions} batches={options.batchOptions} />}
      />
      <AnnouncementList announcements={announcements} programs={options.programOptions} batches={options.batchOptions} canEdit={() => true} />
    </>
  );
}
