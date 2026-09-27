import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Wallet } from "lucide-react";

import { DashboardShell } from "@/components/dashboard/shell";
import { STUDENT_NAV } from "@/lib/navigation";
import { requireRole } from "@/server/auth/session";
import { getNotifications } from "@/server/queries/platform";
import { getStudentContext } from "@/server/queries/student";

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s · Student dashboard" },
  robots: { index: false, follow: false },
};

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(["STUDENT"], { next: "/dashboard" });
  const [ctx, notifications] = await Promise.all([
    getStudentContext(session.uid),
    getNotifications(session.uid, 20),
  ]);
  if (!ctx) redirect("/login");
  if (!ctx.user.onboarded) redirect("/onboarding");

  const awaitingPayment = ctx.enrollment?.status === "AWAITING_PAYMENT";
  const banner = awaitingPayment ? (
    <div className="border-b-2 border-ink bg-amber px-4 py-2.5 text-sm sm:px-6" role="status">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-semibold">
          <Wallet className="size-4" aria-hidden />
          {ctx.enrollment!.payment.status === "PAYMENT_IN_REVIEW"
            ? "Your payment is being verified by our team."
            : "Your application is approved — complete your payment to activate your enrollment."}
        </span>
        <Link href="/dashboard/payment" className="font-bold underline underline-offset-4">
          Payment status →
        </Link>
      </div>
    </div>
  ) : null;

  return (
    <DashboardShell
      area="student"
      nav={STUDENT_NAV}
      user={{
        uid: session.uid,
        name: ctx.user.name,
        email: ctx.user.email,
        role: session.role,
        image: ctx.user.profileImage,
      }}
      notifications={notifications}
      notificationsHref="/dashboard/notifications"
      profileHref="/dashboard/profile"
      banner={banner}
    >
      {children}
    </DashboardShell>
  );
}
