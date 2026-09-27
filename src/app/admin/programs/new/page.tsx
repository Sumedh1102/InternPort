import { ProgramForm } from "@/components/admin/program-form";
import { PageHeader } from "@/components/dashboard/ui";
import { requireRole } from "@/server/auth/session";

export const metadata = { title: "New program" };

export default async function NewProgramPage() {
  await requireRole(["ADMIN", "SUPER_ADMIN"]);
  return (
    <>
      <PageHeader back={{ href: "/admin/programs", label: "Programs" }} title="New program" description="Start as a draft; publish when it's ready for applications." />
      <ProgramForm />
    </>
  );
}
