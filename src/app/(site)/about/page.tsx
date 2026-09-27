import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Sparkle, StickerLabel } from "@/components/brand/decor";
import { CtaBand, LucideIcon } from "@/components/site/blocks";
import { Container, PageHero, SectionHeading } from "@/components/site/section-heading";
import { buttonVariants } from "@/components/ui/button";
import { SERVICES } from "@/lib/content";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: `${SITE.name} focuses on software development, AI/ML, web, mobile, cloud, IT consulting, technology training and internship programs.`,
  alternates: { canonical: "/about" },
};

const PRINCIPLES = [
  { title: "Learn by building", body: "Skills stick when you ship. Our training and internships are organised around real, reviewable work." },
  { title: "AI-forward, human-guided", body: "We use modern AI tools every day — and teach students to use them to learn, not to skip learning." },
  { title: "Honest outcomes", body: "We focus on skills, projects and verifiable certificates. We don't make placement promises." },
  { title: "Clear processes", body: "From application to certificate, every step is visible in your dashboard." },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        kicker="About us"
        title="We build technology — and the people who"
        highlight="build it."
        description={`${SITE.name} is a technology company working across software, AI/ML, web, mobile and cloud. We also run training and internship programs so students can learn the way professionals work.`}
      />

      <section className="py-16 sm:py-24">
        <Container className="grid gap-12 lg:grid-cols-[1fr_1.2fr]">
          <SectionHeading kicker="Focus areas" title="What we" highlight="work on." />
          <ul className="grid gap-3 sm:grid-cols-2">
            {SERVICES.map((s) => (
              <li
                key={s.key}
                className="flex items-center gap-3 rounded-2xl border-2 border-ink bg-paper p-4 shadow-brutal-xs"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl border-2 border-ink bg-lime">
                  <LucideIcon name={s.icon} className="size-5" />
                </span>
                <span className="font-semibold">{s.title}</span>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section className="border-y-2 border-ink bg-ink py-16 text-paper sm:py-24">
        <Container>
          <StickerLabel tone="lime">How we think</StickerLabel>
          <h2 className="font-display-wide mt-4 max-w-3xl text-4xl leading-[0.95] sm:text-6xl">
            Principles we teach <span className="text-lime">and practise.</span>
          </h2>
          <ul className="mt-10 grid gap-5 sm:grid-cols-2">
            {PRINCIPLES.map((p, i) => (
              <li key={p.title} className="rounded-card border-2 border-paper/80 bg-ink-2 p-6">
                <span className="font-mono text-xs text-lime">0{i + 1}</span>
                <h3 className="mt-2 font-display text-2xl font-extrabold">{p.title}</h3>
                <p className="mt-2 text-paper/75">{p.body}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section className="py-16 sm:py-24">
        <Container className="flex flex-col items-start gap-6 rounded-chunk border-2 border-ink bg-lime p-8 shadow-brutal sm:p-12">
          <Sparkle className="size-10 text-paper" />
          <h2 className="font-display-wide text-3xl sm:text-5xl">Meet the people behind Sainam.</h2>
          <div className="flex flex-wrap gap-3">
            <Link href="/team" className={buttonVariants({ variant: "dark" })}>
              Our team <ArrowRight aria-hidden />
            </Link>
            <Link href="/services" className={buttonVariants({ variant: "outline" })}>
              Services
            </Link>
          </div>
        </Container>
      </section>

      <CtaBand />
    </>
  );
}
