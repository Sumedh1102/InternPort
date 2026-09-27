import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { StickerLabel } from "@/components/brand/decor";
import { ProfileForm } from "@/components/forms/profile-form";
import { ROLE_HOME } from "@/lib/domain/workflows";
import { requireSession } from "@/server/auth/session";
import { getUser } from "@/server/queries/platform";
import { firstName } from "@/lib/utils";

export const metadata: Metadata = { title: "Set up your profile", robots: { index: false } };

export default async function OnboardingPage() {
  const session = await requireSession({ next: "/onboarding" });
  if (session.role !== "STUDENT") redirect(ROLE_HOME[session.role]);
  const user = await getUser(session.uid);
  if (!user) redirect("/login");
  if (user.onboarded) redirect("/dashboard");
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start gap-3">
        <StickerLabel tone="lime">Almost there</StickerLabel>
        <h1 className="font-display-wide text-4xl sm:text-5xl">Hi {firstName(user.name)} 👋</h1>
        <p className="text-muted">Tell us a little about yourself. You can change this any time from your profile.</p>
      </div>
      <ProfileForm user={user} mode="onboarding" />
    </div>
  );
}
