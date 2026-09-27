import { redirect } from "next/navigation";

import { ProfileForm } from "@/components/forms/profile-form";
import { PageHeader } from "@/components/dashboard/ui";
import { requireRole } from "@/server/auth/session";
import { getUser } from "@/server/queries/platform";

export const metadata = { title: "Profile" };

export default async function MentorProfilePage() {
  const session = await requireRole(["MENTOR"]);
  const user = await getUser(session.uid);
  if (!user) redirect("/login");
  return (
    <>
      <PageHeader title="Profile" description="Your mentor profile." />
      <ProfileForm user={user} mode="profile" />
    </>
  );
}
