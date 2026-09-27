import type { Metadata } from "next";
import Link from "next/link";

import { StickerLabel } from "@/components/brand/decor";
import { RegisterForm } from "@/components/forms/auth-forms";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create your Sainam Technology account to apply for the Winter Internship 2026.",
  alternates: { canonical: "/register" },
};

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const { next } = await searchParams;
  const nextParam = typeof next === "string" ? next : null;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start gap-3">
        <StickerLabel tone="pink">Step 1 of your journey</StickerLabel>
        <h1 className="font-display-wide text-4xl sm:text-5xl">Create your account.</h1>
        <p className="text-muted">You&apos;ll use it to apply, track your application and learn.</p>
      </div>
      <div className="rounded-chunk border-2 border-ink bg-paper p-5 shadow-brutal sm:p-7">
        <RegisterForm next={nextParam} />
      </div>
      <p className="text-center text-sm">
        Already have an account?{" "}
        <Link
          href={nextParam ? `/login?next=${encodeURIComponent(nextParam)}` : "/login"}
          className="font-semibold underline decoration-pink decoration-2 underline-offset-4"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
