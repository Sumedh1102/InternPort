import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/shell";
import { MENTOR_NAV } from "@/lib/navigation";
import { requireRole } from "@/server/auth/session";
import { getNotifications, getUser } from "@/server/queries/platform";

export const metadata: Metadata = {
  title: { default: "Mentor", template: "%s · Mentor" },
  robots: { index: false, follow: false },
};

export default async function MentorLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(["MENTOR"], { next: "/mentor" });
  const [user, notifications] = await Promise.all([getUser(session.uid), getNotifications(session.uid, 20)]);
  if (!user) redirect("/login");
  return (
    <DashboardShell
      area="mentor"
      nav={MENTOR_NAV}
      user={{ uid: session.uid, name: user.name, email: user.email, role: session.role, image: user.profileImage }}
      notifications={notifications}
      profileHref="/mentor/profile"
    >
      {children}
    </DashboardShell>
  );
}
