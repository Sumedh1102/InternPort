import type { Metadata } from "next";

import { Sparkle } from "@/components/brand/decor";
import { Reveal } from "@/components/brand/reveal";
import { CtaBand } from "@/components/site/blocks";
import { Container, PageHero, SectionHeading } from "@/components/site/section-heading";
import { TechBadge, TechMarquee } from "@/components/site/tech";
import { TECH_STACK } from "@/lib/content";
import { HERO_BADGES, TECH_MARQUEE } from "@/lib/site";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Technology",
  description:
    "The technologies Sainam Technology builds with and teaches: AI/ML, generative AI, React, Next.js, Node.js, Python, cloud and developer tooling.",
  alternates: { canonical: "/technology" },
};

const HEAD = {
  lime: "bg-lime",
  pink: "bg-pink",
  cyan: "bg-cyan",
  blue: "bg-blue text-paper",
} as const;

export default function TechnologyPage() {
  return (
    <>
      <PageHero
        kicker="Technology"
        title="The stack we build with —"
        highlight="and teach."
        description="Modern, widely used tools across AI, the web and the cloud. Interns work with the same kind of stack professionals use."
      />
      <TechMarquee items={TECH_MARQUEE} tone="lime" />

      <section className="py-16 sm:py-24">
        <Container>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {TECH_STACK.map((g, i) => (
              <Reveal as="li" key={g.group} delay={(i % 3) * 70}>
                <div className="h-full overflow-hidden rounded-card border-2 border-ink bg-paper shadow-brutal">
                  <h2
                    className={cn(
                      "flex items-center justify-between border-b-2 border-ink px-5 py-4 font-display text-xl font-extrabold",
                      HEAD[g.tone],
                    )}
                  >
                    {g.group}
                    <Sparkle className="size-5 text-paper" />
                  </h2>
                  <ul className="flex flex-wrap gap-2 p-5">
                    {g.items.map((item) => (
                      <li
                        key={item}
                        className="rounded-full border-2 border-ink bg-cream px-3 py-1 font-mono text-xs font-semibold"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </ul>
        </Container>
      </section>

      <section className="border-y-2 border-ink bg-cream-2 py-16 sm:py-24">
        <Container>
          <SectionHeading
            kicker="AI tools"
            title="Fluent in the"
            highlight="AI toolbox."
            description="Students learn how assistants and models like these work, where they help, and where they don't — so they can use them responsibly."
          />
          <ul className="mt-10 flex flex-wrap gap-3">
            {HERO_BADGES.map((b, i) => (
              <li key={b.name} style={{ rotate: `${(i % 3) - 1}deg` }}>
                <TechBadge name={b.name} glyph={b.glyph} tone={b.tone} />
              </li>
            ))}
          </ul>
          <p className="mt-6 text-xs text-muted">
            Product names are trademarks of their respective owners and are shown to describe technologies covered;
            no endorsement is implied.
          </p>
        </Container>
      </section>

      <CtaBand />
    </>
  );
}
