import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { VerifyEmailPanel } from "@/components/forms/auth-forms";
import { ROLE_HOME } from "@/lib/domain/workflows";
import { getSession } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Verify your email",
  robots: { index: false },
};

export default async function VerifyEmailPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.emailVerified) redirect(ROLE_HOME[session.role]);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display-wide text-4xl sm:text-5xl">Verify your email.</h1>
        <p className="mt-2 text-muted">One quick step to keep your account secure.</p>
      </div>
      <div className="rounded-chunk border-2 border-ink bg-paper p-5 shadow-brutal sm:p-7">
        <VerifyEmailPanel email={session.email} />
      </div>
    </div>
  );
}
