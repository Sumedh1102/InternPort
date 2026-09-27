import { PageHeader } from "@/components/dashboard/ui";
import { StudentProgressTable } from "@/components/staff/tables";
import { requireRole } from "@/server/auth/session";
import { metricsForEnrollments } from "@/server/metrics";
import { listProjects } from "@/server/queries/platform";
import { getMentorContext } from "@/server/queries/mentor";

export const metadata = { title: "Students" };

export default async function MentorStudentsPage() {
  const session = await requireRole(["MENTOR"]);
  const ctx = await getMentorContext(session.uid);
  const [metrics, projects] = await Promise.all([
    metricsForEnrollments(ctx.students),
    listProjects({ batchIds: ctx.batchIds }),
  ]);
  return (
    <>
      <PageHeader title="Students" description="Track progress across lessons, assignments, attendance and projects. Assign and review projects from here." />
      <StudentProgressTable enrollments={ctx.students} metrics={metrics} projects={projects} />
    </>
  );
}
