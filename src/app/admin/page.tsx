import Link from "next/link";
import {
  Award,
  CircleAlert,
  GraduationCap,
  Inbox,
  Layers,
  Mail,
  ShieldCheck,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";

import { DashboardCard, PageHeader } from "@/components/dashboard/ui";
import { StatusBadge } from "@/components/ui/badge";
import { Stat } from "@/components/ui/feedback";
import { earlyBirdRemaining } from "@/lib/domain/pricing";
import { formatDate, relativeTime } from "@/lib/utils";
import { COL, col, countOf } from "@/server/db";
import { requireRole } from "@/server/auth/session";
import { listApplications, listContactMessages, listEnrollments } from "@/server/queries/platform";
import { getSettings } from "@/server/queries/settings";

export const metadata = { title: "Overview" };

export default async function AdminOverview() {
  await requireRole(["ADMIN", "SUPER_ADMIN"]);
  const [applications, enrollments, settings, messages, students, activePrograms, activeBatches, certificates] = await Promise.all([
    listApplications(),
    listEnrollments(),
    getSettings(),
    listContactMessages(10),
    countOf(col(COL.users).where("role", "==", "STUDENT")),
    countOf(col(COL.programs).where("status", "==", "PUBLISHED")),
    countOf(col(COL.batches).where("status", "==", "ACTIVE")),
    countOf(col(COL.certificates).where("status", "==", "VALID")),
  ]);

  const pendingApps = applications.filter((a) => a.status === "PENDING" || a.status === "UNDER_REVIEW");
  const active = enrollments.filter((e) => e.status === "ACTIVE");
  const completed = enrollments.filter((e) => e.status === "COMPLETED");
  const awaiting = enrollments.filter((e) => e.status === "AWAITING_PAYMENT");
  const paymentPending = awaiting.filter((e) => e.payment.status === "PAYMENT_PENDING");
  const paymentReview = awaiting.filter((e) => e.payment.status === "PAYMENT_IN_REVIEW");
  const paymentIssues = enrollments.filter((e) => e.payment.status === "PAYMENT_REJECTED" && e.status !== "CANCELLED");
  const confirmedNotActive = awaiting.filter((e) => e.payment.status === "PAYMENT_CONFIRMED");
  const openMessages = messages.filter((m) => !m.handled);

  return (
    <>
      <PageHeader
        kicker="Admin"
        title="Operations overview"
        description="Real-time counts from applications, enrollments and payments. Payments are verified manually — there is no revenue tracking in V1."
      />
      <div className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Applications" value={applications.length} icon={<Inbox />} hint={`${pendingApps.length} awaiting review`} />
          <Stat label="Pending review" value={pendingApps.length} icon={<CircleAlert />} tone={pendingApps.length ? "pink" : "paper"} />
          <Stat label="Total students" value={students} icon={<Users />} hint="Registered student accounts" />
          <Stat label="Active interns" value={active.length} icon={<UserCheck />} tone="lime" />
          <Stat label="Completed" value={completed.length} icon={<GraduationCap />} />
          <Stat label="Active programs" value={activePrograms} icon={<Layers />} />
          <Stat label="Active batches" value={activeBatches} icon={<Layers />} />
          <Stat label="Certificates issued" value={certificates} icon={<Award />} tone="ink" />
        </div>

        <section className="rounded-card border-2 border-ink bg-paper p-5 shadow-brutal-sm">
          <h2 className="flex items-center gap-2 font-display text-lg font-extrabold">
            <Wallet className="size-5" aria-hidden /> Manual payments & enrollment
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Payment pending" value={paymentPending.length} hint="Approved, not yet paid" />
            <Stat label="Needs verification" value={paymentReview.length} hint="Student reported payment" tone={paymentReview.length ? "pink" : "paper"} />
            <Stat label="Payment issues" value={paymentIssues.length} hint="Rejected references" tone={paymentIssues.length ? "pink" : "paper"} />
            <Stat label="Verified, not active" value={confirmedNotActive.length} hint="Assign batch & activate" icon={<ShieldCheck />} />
          </div>
          <p className="mt-4 text-sm text-muted">
            Early-bird seats: {settings.earlyBird.claimed}/{settings.earlyBird.limit} claimed · {earlyBirdRemaining(settings)} remaining
            {settings.earlyBird.enabled ? "" : " (early bird disabled)"} · Applications {settings.applicationsOpen ? "open" : "closed"}
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <DashboardCard title="Applications to review" icon={<Inbox />} href="/admin/applications">
            {pendingApps.length ? (
              <ul className="flex flex-col gap-2">
                {pendingApps.slice(0, 6).map((a) => (
                  <li key={a.id}>
                    <Link href={`/admin/applications/${a.id}`} className="flex items-center justify-between gap-3 rounded-xl border-2 border-ink/15 p-3 hover:border-ink hover:bg-lime-soft">
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{a.fullName}</span>
                        <span className="block truncate text-xs text-muted">
                          {a.programName} · {relativeTime(a.createdAt)}
                        </span>
                      </span>
                      <StatusBadge status={a.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No applications waiting. 🎉</p>
            )}
          </DashboardCard>
          <DashboardCard title="Payment verification queue" icon={<Wallet />} href="/admin/students?tab=payments">
            {paymentReview.length || confirmedNotActive.length ? (
              <ul className="flex flex-col gap-2">
                {[...paymentReview, ...confirmedNotActive].slice(0, 6).map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 rounded-xl border-2 border-ink/15 p-3">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{e.studentName}</span>
                      <span className="block truncate text-xs text-muted">
                        {e.programName} · ref {e.payment.reference ?? "—"}
                      </span>
                    </span>
                    <StatusBadge status={e.payment.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Nothing to verify right now.</p>
            )}
          </DashboardCard>
          <DashboardCard title="Messages" icon={<Mail />} href="/admin/settings?tab=messages" className="lg:col-span-2">
            {openMessages.length ? (
              <ul className="grid gap-2 md:grid-cols-2">
                {openMessages.slice(0, 6).map((m) => (
                  <li key={m.id} className="rounded-xl border-2 border-ink/15 p-3 text-sm">
                    <p className="font-semibold">
                      {m.subject} <span className="font-mono text-xs text-muted">({m.kind.toLowerCase()})</span>
                    </p>
                    <p className="text-xs text-muted">
                      {m.name} · {m.email} · {formatDate(m.createdAt)}
                    </p>
                    <p className="mt-1 line-clamp-2">{m.message}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No open contact or support messages.</p>
            )}
          </DashboardCard>
        </div>
      </div>
    </>
  );
}
