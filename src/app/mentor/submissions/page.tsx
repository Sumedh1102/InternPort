import { PageHeader } from "@/components/dashboard/ui";
import { SubmissionsTable } from "@/components/staff/tables";
import { requireRole } from "@/server/auth/session";
import { listSubmissions } from "@/server/queries/platform";
import { getMentorContext } from "@/server/queries/mentor";

export const metadata = { title: "Submissions" };

export default async function MentorSubmissionsPage({ searchParams }: PageProps<"/mentor/submissions">) {
  const session = await requireRole(["MENTOR"]);
  const { open } = await searchParams;
  const ctx = await getMentorContext(session.uid);
  const submissions = await listSubmissions({ batchIds: ctx.batchIds });
  return (
    <>
      <PageHeader title="Submissions" description="Review work, give feedback and score submissions from your batches." />
      <SubmissionsTable submissions={submissions} openId={typeof open === "string" ? open : undefined} />
    </>
  );
}
