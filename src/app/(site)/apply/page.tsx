import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, LogIn, UserPlus } from "lucide-react";

import { ApplicationForm, type ApplyProgramOption } from "@/components/forms/application-form";
import { Container, PageHero } from "@/components/site/section-heading";
import { StatusBadge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { earlyBirdRemaining } from "@/lib/domain/pricing";
import { ROLE_HOME } from "@/lib/domain/workflows";
import { formatDate } from "@/lib/utils";
import { getSession } from "@/server/auth/session";
import { getApplicationsForUser, getUser } from "@/server/queries/platform";
import { getPublicPrograms } from "@/server/queries/programs";
import { getPublicSettings } from "@/server/queries/settings";

export const metadata: Metadata = {
  title: "Apply — Winter Internship 2026",
  description: "Apply for the Sainam Technology Winter Internship 2026. Choose your domain and tell us about yourself.",
  alternates: { canonical: "/apply" },
};

export default async function ApplyPage({ searchParams }: PageProps<"/apply">) {
  const { program: programSlug } = await searchParams;
  const slug = typeof programSlug === "string" ? programSlug : undefined;
  const next = `/apply${slug ? `?program=${encodeURIComponent(slug)}` : ""}`;
  const session = await getSession();

  const hero = (
    <PageHero
      kicker="Apply"
      title="Your internship starts"
      highlight="here."
      description="It takes about 5 minutes. Your application goes straight to the Sainam Technology team for review."
    />
  );

  if (!session) {
    return (
      <>
        {hero}
        <Container className="py-16">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-4 rounded-card border-2 border-ink bg-lime p-6 shadow-brutal">
              <UserPlus className="size-8" aria-hidden />
              <h2 className="font-display text-3xl font-extrabold">New here?</h2>
              <p>Create a free account to apply and track your application, payment and enrollment in one place.</p>
              <Link href={`/register?next=${encodeURIComponent(next)}`} className={buttonVariants({ variant: "dark", size: "lg" })}>
                Create account <ArrowRight aria-hidden />
              </Link>
            </div>
            <div className="flex flex-col gap-4 rounded-card border-2 border-ink bg-paper p-6 shadow-brutal">
              <LogIn className="size-8" aria-hidden />
              <h2 className="font-display text-3xl font-extrabold">Have an account?</h2>
              <p>Log in and we&apos;ll bring you straight back to the application form.</p>
              <Link href={`/login?next=${encodeURIComponent(next)}`} className={buttonVariants({ variant: "outline", size: "lg" })}>
                Log in
              </Link>
            </div>
          </div>
        </Container>
      </>
    );
  }

  if (!session.emailVerified) redirect("/verify-email");
  if (session.role !== "STUDENT") {
    return (
      <>
        {hero}
        <Container className="py-16">
          <Alert tone="info" title="You're signed in with a staff account">
            Applications are for students. <Link href={ROLE_HOME[session.role]} className="underline">Go to your dashboard</Link>.
          </Alert>
        </Container>
      </>
    );
  }

  const [{ data: programs }, settings, user, applications] = await Promise.all([
    getPublicPrograms(),
    getPublicSettings(),
    getUser(session.uid),
    getApplicationsForUser(session.uid),
  ]);
  if (!user) redirect("/login");
  if (!user.onboarded) redirect("/onboarding");

  const activeByProgram = new Map(
    applications.filter((a) => a.status !== "REJECTED").map((a) => [a.programId, a]),
  );
  const options: ApplyProgramOption[] = programs.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    domain: p.domain,
    earlyBird: p.fees.earlyBird,
    regular: p.fees.regular,
    durationLabel: p.durationLabel,
    disabledReason: activeByProgram.has(p.id)
      ? "Already applied"
      : p.status !== "PUBLISHED"
        ? "Applications paused"
        : undefined,
  }));
  const initial = options.find((o) => o.slug === slug && !o.disabledReason)?.id;

  return (
    <>
      {hero}
      <Container className="grid gap-8 py-12 lg:grid-cols-[1fr_320px] lg:py-16">
        <div className="min-w-0">
          {!settings.applicationsOpen ? (
            <Alert tone="warning" title="Applications are currently closed">
              Please check back soon. Your existing applications are listed on your dashboard.
            </Alert>
          ) : options.every((o) => o.disabledReason) ? (
            <EmptyState
              title={options.length ? "You've applied to every open program" : "No programs are open right now"}
              description="Track your applications from your dashboard."
              action={
                <Link href="/dashboard" className={buttonVariants({ size: "sm" })}>
                  Go to dashboard
                </Link>
              }
            />
          ) : (
            <ApplicationForm
              user={user}
              programs={options}
              initialProgramId={initial}
              earlyBirdOpen={earlyBirdRemaining(settings) > 0}
            />
          )}
        </div>
        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-card border-2 border-ink bg-paper p-5 shadow-brutal-sm">
            <h2 className="font-display text-lg font-extrabold">Your applications</h2>
            {applications.length ? (
              <ul className="mt-3 flex flex-col gap-3">
                {applications.map((a) => (
                  <li key={a.id} className="flex flex-col gap-1 rounded-xl border-2 border-ink/20 p-3">
                    <span className="font-semibold">{a.programName}</span>
                    <span className="flex items-center justify-between gap-2 text-xs text-muted">
                      {formatDate(a.createdAt)} <StatusBadge status={a.status} />
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted">None yet — this will be your first.</p>
            )}
          </div>
          <div className="rounded-card border-2 border-ink bg-cream-2 p-5 text-sm">
            <h2 className="font-display text-lg font-extrabold">What happens next?</h2>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>Admin reviews your application</li>
              <li>If approved, you get payment instructions</li>
              <li>You pay offline & submit the reference</li>
              <li>We verify it and activate your enrollment</li>
            </ol>
          </div>
        </aside>
      </Container>
    </>
  );
}
