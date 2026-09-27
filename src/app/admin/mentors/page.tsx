import { RoleForm } from "@/components/admin/catalog-forms";
import { DashboardCard, PageHeader } from "@/components/dashboard/ui";
import { ActionButton } from "@/components/ui/action-button";
import { StatusBadge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { label } from "@/lib/domain/enums";
import { setUserDisabled, setUserRole } from "@/server/actions/admin";
import { requireRole } from "@/server/auth/session";
import { getSessionsForBatches, getUsersByRole, listBatches, listEnrollments, listSubmissions } from "@/server/queries/platform";

export const metadata = { title: "Mentors" };

export default async function AdminMentorsPage() {
  const session = await requireRole(["ADMIN", "SUPER_ADMIN"]);
  const [staff, batches, enrollments, submissions] = await Promise.all([
    getUsersByRole(["MENTOR", "ADMIN", "SUPER_ADMIN"]),
    listBatches(),
    listEnrollments(),
    listSubmissions(),
  ]);
  const sessions = await getSessionsForBatches(batches.map((b) => b.id));
  const isSuper = session.role === "SUPER_ADMIN";

  return (
    <>
      <PageHeader title="Mentors & staff" description="Grant roles by email, see each mentor's batches and workload." />
      <div className="flex flex-col gap-6">
        <DashboardCard title="Grant a role">
          <p className="mb-4 text-sm text-muted">
            The person must already have an account. Roles are stored as Firebase custom claims; they&apos;ll be asked to sign in
            again. {isSuper ? "As super admin you can grant any role." : "Only super admins can grant admin roles."}
          </p>
          <RoleForm actorRole={session.role} />
        </DashboardCard>
        <DataTable
          caption="Staff"
          filters={[{ key: "role", label: "Role", options: ["MENTOR", "ADMIN", "SUPER_ADMIN"].map((r) => ({ value: r, label: label(r) })) }]}
          columns={[
            { key: "name", header: "Name", sortable: true },
            { key: "role", header: "Role" },
            { key: "batches", header: "Batches" },
            { key: "load", header: "Workload", hideOnMobile: true },
            { key: "actions", header: "" },
          ]}
          emptyTitle="No mentors yet"
          emptyDescription="Grant the Mentor role to a registered user above."
          rows={staff.map((u) => {
            const mine = batches.filter((b) => b.mentorIds.includes(u.id));
            const ids = new Set(mine.map((b) => b.id));
            const students = enrollments.filter((e) => e.status === "ACTIVE" && e.batchId && ids.has(e.batchId)).length;
            const pending = submissions.filter((s) => s.batchId && ids.has(s.batchId) && (s.status === "SUBMITTED" || s.status === "UNDER_REVIEW")).length;
            const upcoming = sessions.filter((s) => ids.has(s.batchId) && s.status === "SCHEDULED").length;
            const manageable = isSuper || u.role === "MENTOR";
            return {
              id: u.id,
              search: `${u.name} ${u.email}`,
              filters: { role: u.role },
              sort: { name: u.name },
              cells: {
                name: (
                  <div>
                    <p className="font-semibold">{u.name}</p>
                    <p className="text-xs text-muted">{u.email}</p>
                    {u.disabled && <StatusBadge status="SUSPENDED" className="mt-1" />}
                  </div>
                ),
                role: <span className="font-mono text-xs font-bold">{label(u.role)}</span>,
                batches: mine.length ? mine.map((b) => b.name).join(", ") : <span className="text-muted">—</span>,
                load: (
                  <span className="text-sm">
                    {students} students · {pending} to review
                    <span className="block text-xs text-muted">{upcoming} scheduled sessions</span>
                  </span>
                ),
                actions:
                  u.id === session.uid || !manageable ? null : (
                    <div className="flex flex-wrap gap-1">
                      {u.role === "MENTOR" && (
                        <ActionButton
                          action={setUserRole.bind(null, { email: u.email, role: "STUDENT" })}
                          size="sm"
                          variant="ghost"
                          confirm={{ title: `Remove mentor role from ${u.name}?`, description: "They will become a student account.", danger: true, confirmLabel: "Remove role" }}
                        >
                          Remove role
                        </ActionButton>
                      )}
                      <ActionButton
                        action={setUserDisabled.bind(null, u.id, !u.disabled)}
                        size="sm"
                        variant="ghost"
                        confirm={{ title: u.disabled ? `Enable ${u.name}?` : `Disable ${u.name}?`, danger: !u.disabled, confirmLabel: u.disabled ? "Enable" : "Disable" }}
                      >
                        {u.disabled ? "Enable" : "Disable"}
                      </ActionButton>
                    </div>
                  ),
              },
            };
          })}
        />
      </div>
    </>
  );
}
