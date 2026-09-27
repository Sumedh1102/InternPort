import type { Metadata } from "next";
import Link from "next/link";

import { ForgotPasswordForm } from "@/components/forms/auth-forms";

export const metadata: Metadata = {
  title: "Reset password",
  robots: { index: false },
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display-wide text-4xl sm:text-5xl">Reset password.</h1>
        <p className="mt-2 text-muted">Enter your account email and we&apos;ll send you a reset link.</p>
      </div>
      <div className="rounded-chunk border-2 border-ink bg-paper p-5 shadow-brutal sm:p-7">
        <ForgotPasswordForm />
      </div>
      <p className="text-center text-sm">
        <Link href="/login" className="font-semibold underline decoration-pink decoration-2 underline-offset-4">
          Back to log in
        </Link>
      </p>
    </div>
  );
}
