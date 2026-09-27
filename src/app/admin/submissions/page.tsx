import { PageHeader } from "@/components/dashboard/ui";
import { SubmissionsTable } from "@/components/staff/tables";
import { requireRole } from "@/server/auth/session";
import { listSubmissions } from "@/server/queries/platform";

export const metadata = { title: "Submissions" };

export default async function AdminSubmissionsPage({ searchParams }: PageProps<"/admin/submissions">) {
  await requireRole(["ADMIN", "SUPER_ADMIN"]);
  const { open } = await searchParams;
  const submissions = await listSubmissions();
  return (
    <>
      <PageHeader title="Submissions" description="Every submitted assignment across all programs and batches." />
      <SubmissionsTable submissions={submissions} openId={typeof open === "string" ? open : undefined} />
    </>
  );
}
