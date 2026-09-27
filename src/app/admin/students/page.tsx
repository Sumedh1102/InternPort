import Link from "next/link";

import { EnrollmentDialog, PaymentDialog } from "@/components/admin/enrollment-actions";
import { PageHeader } from "@/components/dashboard/ui";
import { StudentProgressTable } from "@/components/staff/tables";
import { ActionButton } from "@/components/ui/action-button";
import { StatusBadge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { ENROLLMENT_STATUSES, PAYMENT_STATUSES, label } from "@/lib/domain/enums";
import { formatINR } from "@/lib/domain/pricing";
import type { Enrollment } from "@/lib/domain/types";
import { cn, formatDate } from "@/lib/utils";
import { setUserDisabled } from "@/server/actions/admin";
import { activateEnrollment } from "@/server/actions/payments";
import { requireRole } from "@/server/auth/session";
import { metricsForEnrollments } from "@/server/metrics";
import { getAdminOptions } from "@/server/queries/admin";
import { getUsersByRole, listEnrollments, listProjects } from "@/server/queries/platform";

export const metadata = { title: "Students & payments" };

const TABS = [
  { key: "payments", label: "Payment queue" },
  { key: "active", label: "Active interns" },
  { key: "all", label: "All enrollments" },
  { key: "accounts", label: "Student accounts" },
] as const;

function PaymentCell({ e }: { e: Enrollment }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <StatusBadge status={e.payment.status} />
      <span className="text-xs text-muted">
        {formatINR(e.payment.totalAmount)} · {label(e.payment.pricingTier)}
      </span>
      {e.payment.reference && <span className="font-mono text-xs">ref {e.payment.reference}</span>}
    </div>
  );
}

export default async function AdminStudentsPage({ searchParams }: PageProps<"/admin/students">) {
  const session = await requireRole(["ADMIN", "SUPER_ADMIN"]);
  const { tab: tabParam } = await searchParams;
  const tab = TABS.find((t) => t.key === tabParam)?.key ?? "payments";
  const [enrollments, options] = await Promise.all([listEnrollments(), getAdminOptions()]);

  const actions = (e: Enrollment) => (
    <div className="flex flex-wrap items-center gap-1">
      <PaymentDialog enrollment={e} />
      {e.status === "AWAITING_PAYMENT" && e.payment.status === "PAYMENT_CONFIRMED" && (
        <ActionButton action={activateEnrollment.bind(null, e.id)} size="sm" variant="dark" disabled={!e.batchId} title={e.batchId ? undefined : "Assign a batch first"}>
          Activate
        </ActionButton>
      )}
      <EnrollmentDialog enrollment={e} batches={options.batchOptions} mentors={options.mentorOptions} />
    </div>
  );

  let body: React.ReactNode;
  if (tab === "active") {
    const active = enrollments.filter((e) => e.status === "ACTIVE" || e.status === "COMPLETED");
    const [metrics, projects] = await Promise.all([metricsForEnrollments(active), listProjects()]);
    body = (
      <StudentProgressTable
        enrollments={active}
        metrics={metrics}
        projects={projects}
        canFeature
        extraColumns={[{ key: "manage", header: "", render: (e) => actions(e) }]}
      />
    );
  } else if (tab === "accounts") {
    const students = await getUsersByRole(["STUDENT"]);
    const enrolledUids = new Set(enrollments.map((e) => e.uid));
    body = (
      <DataTable
        caption="Student accounts"
        searchPlaceholder="Search name, email, college…"
        columns={[
          { key: "name", header: "Student", sortable: true },
          { key: "college", header: "College", hideOnMobile: true },
          { key: "joined", header: "Joined", sortable: true, hideOnMobile: true },
          { key: "state", header: "Status" },
          { key: "actions", header: "" },
        ]}
        rows={students.map((u) => ({
          id: u.id,
          search: `${u.name} ${u.email} ${u.college ?? ""}`,
          sort: { name: u.name, joined: u.createdAt ?? "" },
          cells: {
            name: (
              <div>
                <p className="font-semibold">{u.name}</p>
                <p className="text-xs text-muted">{u.email}</p>
              </div>
            ),
            college: [u.college, u.branch].filter(Boolean).join(" · ") || "—",
            joined: formatDate(u.createdAt),
            state: (
              <div className="flex flex-wrap gap-1">
                {u.disabled ? <StatusBadge status="SUSPENDED" /> : enrolledUids.has(u.id) ? <StatusBadge status="ENROLLED" /> : <StatusBadge status="PENDING" />}
                {!u.onboarded && <span className="text-xs text-muted">Onboarding incomplete</span>}
              </div>
            ),
            actions:
              u.id === session.uid ? null : (
                <ActionButton
                  action={setUserDisabled.bind(null, u.id, !u.disabled)}
                  size="sm"
                  variant={u.disabled ? "outline" : "ghost"}
                  confirm={{
                    title: u.disabled ? `Enable ${u.name}?` : `Disable ${u.name}?`,
                    description: u.disabled ? "They will be able to sign in again." : "They will be signed out and unable to sign in.",
                    danger: !u.disabled,
                    confirmLabel: u.disabled ? "Enable" : "Disable",
                  }}
                >
                  {u.disabled ? "Enable" : "Disable"}
                </ActionButton>
              ),
          },
        }))}
      />
    );
  } else {
    const list =
      tab === "payments"
        ? enrollments.filter((e) => e.status === "AWAITING_PAYMENT" || e.payment.status === "PAYMENT_REJECTED")
        : enrollments;
    body = (
      <DataTable
        caption={tab === "payments" ? "Payment queue" : "Enrollments"}
        searchPlaceholder="Search student, program, reference…"
        initialFilters={tab === "payments" && list.some((e) => e.payment.status === "PAYMENT_IN_REVIEW") ? { payment: "PAYMENT_IN_REVIEW" } : {}}
        filters={[
          { key: "payment", label: "Payment", options: PAYMENT_STATUSES.map((s) => ({ value: s, label: label(s) })) },
          { key: "status", label: "Enrollment", options: ENROLLMENT_STATUSES.map((s) => ({ value: s, label: label(s) })) },
        ]}
        columns={[
          { key: "student", header: "Student", sortable: true },
          { key: "program", header: "Program / batch", hideOnMobile: true },
          { key: "payment", header: "Payment" },
          { key: "status", header: "Enrollment" },
          { key: "actions", header: "" },
        ]}
        emptyTitle={tab === "payments" ? "No payments waiting" : "No enrollments yet"}
        emptyDescription="Enrollments are created when an application is approved."
        rows={list.map((e) => ({
          id: e.id,
          search: `${e.studentName} ${e.studentEmail} ${e.programName} ${e.payment.reference ?? ""}`,
          filters: { payment: e.payment.status, status: e.status },
          sort: { student: e.studentName },
          cells: {
            student: (
              <div>
                <p className="font-semibold">{e.studentName}</p>
                <p className="text-xs text-muted">{e.studentEmail}</p>
              </div>
            ),
            program: (
              <span className="text-sm">
                {e.programName}
                <span className="block text-xs text-muted">{e.batchName ?? "No batch"}</span>
              </span>
            ),
            payment: <PaymentCell e={e} />,
            status: <StatusBadge status={e.status} />,
            actions: actions(e),
          },
        }))}
      />
    );
  }

  return (
    <>
      <PageHeader title="Students & payments" description="Verify manual payments, activate enrollments and manage students." />
      <nav aria-label="Student views" className="scrollbar-none mb-6 flex gap-1 overflow-x-auto rounded-full border-2 border-ink bg-paper p-1 shadow-brutal-xs sm:w-fit">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/students?tab=${t.key}`}
            aria-current={tab === t.key ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition",
              tab === t.key ? "bg-ink text-paper" : "text-muted hover:text-ink",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {body}
    </>
  );
}
