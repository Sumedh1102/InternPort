import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/components/forms/auth-forms";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to your Sainam Technology dashboard.",
  alternates: { canonical: "/login" },
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const nextParam = typeof next === "string" ? next : null;
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display-wide text-4xl sm:text-5xl">Welcome back.</h1>
        <p className="mt-2 text-muted">Log in to continue to your dashboard.</p>
      </div>
      <div className="rounded-chunk border-2 border-ink bg-paper p-5 shadow-brutal sm:p-7">
        <LoginForm next={nextParam} />
      </div>
      <p className="text-center text-sm">
        New here?{" "}
        <Link
          href={nextParam ? `/register?next=${encodeURIComponent(nextParam)}` : "/register"}
          className="font-semibold underline decoration-pink decoration-2 underline-offset-4"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
