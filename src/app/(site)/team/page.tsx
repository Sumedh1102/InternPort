import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";

import { CtaBand } from "@/components/site/blocks";
import { TeamCard } from "@/components/site/cards";
import { Container, PageHero } from "@/components/site/section-heading";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import type { TeamMember } from "@/lib/domain/types";
import { isAdminConfigured } from "@/server/firebase-admin";
import { listTeam } from "@/server/queries/platform";

export const metadata: Metadata = {
  title: "Team",
  description: "The founders, engineers and mentors of Sainam Technology.",
  alternates: { canonical: "/team" },
};

export const revalidate = 600;

export default async function TeamPage() {
  let team: TeamMember[] = [];
  if (isAdminConfigured()) {
    try {
      team = await listTeam(true);
    } catch (error) {
      console.error("[team] failed to load", error);
    }
  }
  return (
    <>
      <PageHero
        kicker="Team & founders"
        title="The humans behind"
        highlight="Sainam."
        description="Founders, engineers and mentors who build software and guide every intern through their program."
      />
      <section className="py-16 sm:py-24">
        <Container>
          {team.length ? (
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {team.map((m, i) => (
                <li key={m.id}>
                  <TeamCard member={m} index={i} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<Users />}
              title="Team profiles are coming soon"
              description="We're putting together introductions for our founders and mentors."
              action={
                <Link href="/contact" className={buttonVariants({ size: "sm", variant: "outline" })}>
                  Get in touch
                </Link>
              }
            />
          )}
        </Container>
      </section>
      <CtaBand />
    </>
  );
}
