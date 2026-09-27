import { notFound } from "next/navigation";

import { ProgramForm } from "@/components/admin/program-form";
import { PageHeader } from "@/components/dashboard/ui";
import { StatusBadge } from "@/components/ui/badge";
import { requireRole } from "@/server/auth/session";
import { getProgram } from "@/server/queries/programs";

export const metadata = { title: "Edit program" };

export default async function EditProgramPage({ params }: PageProps<"/admin/programs/[id]">) {
  await requireRole(["ADMIN", "SUPER_ADMIN"]);
  const { id } = await params;
  const program = await getProgram(id);
  if (!program) notFound();
  return (
    <>
      <PageHeader
        back={{ href: "/admin/programs", label: "Programs" }}
        title={program.name}
        description="Changes appear on the public website immediately after saving."
        actions={<StatusBadge status={program.status} />}
      />
      <ProgramForm program={program} />
    </>
  );
}
