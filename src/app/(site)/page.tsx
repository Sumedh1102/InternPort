import Link from "next/link";
import { ArrowRight, Bot, Check, Lightbulb, MessageSquareText } from "lucide-react";

import { Sparkle, Star, StickerLabel, Squiggle } from "@/components/brand/decor";
import { Reveal } from "@/components/brand/reveal";
import { CtaBand, JourneySteps, JsonLd, LucideIcon } from "@/components/site/blocks";
import { ProgramCard } from "@/components/site/cards";
import { Hero } from "@/components/site/hero";
import { Container, SectionHeading } from "@/components/site/section-heading";
import { TechMarquee } from "@/components/site/tech";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { SERVICES, WHY } from "@/lib/content";
import { earlyBirdRemaining, formatINR } from "@/lib/domain/pricing";
import { SITE, TECH_MARQUEE } from "@/lib/site";
import { cn } from "@/lib/utils";
import { getPublicPrograms } from "@/server/queries/programs";
import { getPublicSettings } from "@/server/queries/settings";

export const revalidate = 300;

export default async function HomePage() {
  const [{ data: programs }, settings] = await Promise.all([getPublicPrograms(), getPublicSettings()]);
  const earlyBirdFrom = programs.length ? Math.min(...programs.map((p) => p.fees.earlyBird)) : null;
  const regularFrom = programs.length ? Math.min(...programs.map((p) => p.fees.regular)) : null;
  const seatsLeft = earlyBirdRemaining(settings);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: SITE.name,
          url: SITE.url,
          description: SITE.description,
          knowsAbout: SITE.focusAreas,
        }}
      />
      <Hero earlyBirdFrom={earlyBirdFrom} programCount={programs.length} />
      <TechMarquee items={TECH_MARQUEE} />

      {/* Internships */}
      <section id="internships" className="relative py-16 sm:py-24">
        <Container>
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <SectionHeading
              kicker="Winter Internship 2026"
              title="Pick your"
              highlight="domain."
              description="Seven 3-month programs. Each one mixes structured lessons, mentor-reviewed assignments and a real project."
            />
            <Link href="/internships" className={buttonVariants({ variant: "outline" })}>
              All programs <ArrowRight aria-hidden />
            </Link>
          </div>
          <div className="mt-10">
            {programs.length ? (
              <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {programs.map((program, i) => (
                  <Reveal as="li" key={program.id} delay={(i % 3) * 80} className="h-full">
                    <ProgramCard program={program} index={i} />
                  </Reveal>
                ))}
              </ul>
            ) : (
              <EmptyState
                title="Programs are being published"
                description="Check back shortly — or reach out to us and we'll let you know when applications open."
                action={
                  <Link href="/contact" className={buttonVariants({ size: "sm" })}>
                    Contact us
                  </Link>
                }
              />
            )}
          </div>
        </Container>
      </section>

      {/* Pricing */}
      {earlyBirdFrom && regularFrom && (
        <section className="border-y-2 border-ink bg-cream-2 py-16 sm:py-20">
          <Container className="grid items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
            <SectionHeading
              kicker="Simple pricing"
              title="Early bird for the"
              highlight="first 20."
              description="Fees are per month, per course. There's no online checkout — after approval you'll get payment instructions and our team verifies your payment manually."
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="relative rounded-card border-2 border-ink bg-lime p-6 shadow-brutal">
                <StickerLabel tone="pink" className="absolute -top-4 right-4" rotate={6}>
                  First 20 students
                </StickerLabel>
                <p className="font-mono text-xs font-bold uppercase tracking-wider">Early bird</p>
                <p className="mt-3 font-display text-5xl font-extrabold">{formatINR(earlyBirdFrom)}</p>
                <p className="text-sm font-semibold">/ month / course</p>
                {settings.earlyBird.showRemaining && settings.earlyBird.enabled && (
                  <p className="mt-4 rounded-full border-2 border-ink bg-paper px-3 py-1 text-center text-sm font-bold">
                    {seatsLeft > 0 ? `${seatsLeft} early-bird seats left` : "Early-bird seats are full"}
                  </p>
                )}
              </div>
              <div className="rounded-card border-2 border-ink bg-paper p-6 shadow-brutal">
                <p className="font-mono text-xs font-bold uppercase tracking-wider">Regular</p>
                <p className="mt-3 font-display text-5xl font-extrabold">{formatINR(regularFrom)}</p>
                <p className="text-sm font-semibold">/ month / course</p>
                <ul className="mt-4 flex flex-col gap-1.5 text-sm">
                  {["3-month program", "Mentor reviews", "Verifiable certificate"].map((b) => (
                    <li key={b} className="flex items-center gap-2">
                      <Check className="size-4" aria-hidden /> {b}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Container>
        </section>
      )}

      {/* Services */}
      <section className="py-16 sm:py-24">
        <Container>
          <SectionHeading
            kicker="What we do"
            title="A technology company that"
            highlight="teaches."
            description={`${SITE.name} works across software, AI/ML, web, mobile and cloud — and brings that practice into its training and internships.`}
          />
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICES.map((s, i) => (
              <Reveal as="li" key={s.key} delay={(i % 4) * 60}>
                <Link
                  href="/services"
                  className="group flex h-full flex-col gap-3 rounded-card border-2 border-ink bg-paper p-5 shadow-brutal-sm transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-lime hover:shadow-brutal"
                >
                  <span className="grid size-11 place-items-center rounded-xl border-2 border-ink bg-cream transition group-hover:bg-paper">
                    <LucideIcon name={s.icon} className="size-5" />
                  </span>
                  <h3 className="font-display text-lg font-extrabold leading-tight">{s.title}</h3>
                  <p className="text-sm text-ink-2">{s.blurb}</p>
                </Link>
              </Reveal>
            ))}
          </ul>
        </Container>
      </section>

      {/* AI assistant */}
      <section className="relative overflow-hidden border-y-2 border-ink bg-ink py-16 text-paper sm:py-24">
        <div aria-hidden className="bg-grid-dark absolute inset-0" />
        <Container className="relative grid items-center gap-12 lg:grid-cols-2">
          <div className="flex flex-col gap-5">
            <StickerLabel tone="lime">AI learning assistant</StickerLabel>
            <h2 className="font-display-wide text-4xl leading-[0.95] sm:text-6xl">
              Hints, not <span className="text-lime">shortcuts.</span>
            </h2>
            <p className="max-w-xl text-paper/80 sm:text-lg">
              Enrolled students get an assistant that knows their program, current module and assignments. It explains
              concepts, reads error messages with you and nudges you toward the answer — so you actually learn.
            </p>
            <ul className="grid gap-2 text-sm sm:grid-cols-2">
              {["Explain this concept", "Explain this code", "Help me understand an error", "Give me a hint", "What should I learn next?", "Explain my assignment"].map(
                (q) => (
                  <li key={q} className="flex items-center gap-2">
                    <Sparkle className="size-4 shrink-0 text-lime" /> {q}
                  </li>
                ),
              )}
            </ul>
          </div>
          <div className="relative mx-auto w-full max-w-md">
            <div className="rotate-1 rounded-chunk border-2 border-paper bg-cream p-5 text-ink shadow-[8px_8px_0_0_var(--color-lime)]">
              <div className="flex items-center gap-2 border-b-2 border-ink pb-3 text-sm font-semibold">
                <span className="grid size-8 place-items-center rounded-full border-2 border-ink bg-lime">
                  <Bot className="size-4" aria-hidden />
                </span>
                Sainam assistant
              </div>
              <div className="flex flex-col gap-3 pt-4 text-sm">
                <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm border-2 border-ink bg-pink-soft p-3">
                  <MessageSquareText className="mb-1 size-4" aria-hidden />
                  Why does my React list warn about a “key” prop?
                </p>
                <p className="max-w-[90%] rounded-2xl rounded-bl-sm border-2 border-ink bg-paper p-3">
                  <Lightbulb className="mb-1 size-4" aria-hidden />
                  React uses keys to track which items changed between renders. Look at the element you return inside{" "}
                  <code className="rounded bg-lime-soft px-1 font-mono">.map()</code> — what unique value could identify each
                  item? Try it and tell me what you pick.
                </p>
              </div>
            </div>
            <Star className="absolute -left-6 -top-6 size-12 text-pink" aria-hidden />
          </div>
        </Container>
      </section>

      {/* Why */}
      <section className="py-16 sm:py-24">
        <Container>
          <SectionHeading kicker="Why Sainam" title="Built for" highlight="builders." align="center" />
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {WHY.map((w, i) => (
              <Reveal as="li" key={w.title} delay={(i % 3) * 70}>
                <div
                  className={cn(
                    "flex h-full flex-col gap-3 rounded-card border-2 border-ink p-6 shadow-brutal-sm",
                    i === 0 ? "bg-lime" : i === 4 ? "bg-cyan-soft" : "bg-paper",
                  )}
                >
                  <LucideIcon name={w.icon} className="size-7" />
                  <h3 className="font-display text-xl font-extrabold">{w.title}</h3>
                  <p className="text-sm text-ink-2">{w.body}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </Container>
      </section>

      {/* Journey */}
      <section className="border-t-2 border-ink bg-cream-2 py-16 sm:py-24">
        <Container>
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <SectionHeading kicker="How it works" title="From application to" highlight="dashboard." />
            <Link href="/how-it-works" className={buttonVariants({ variant: "outline" })}>
              Full process <ArrowRight aria-hidden />
            </Link>
          </div>
          <Squiggle className="my-8 h-5 w-40 text-pink" />
          <JourneySteps compact />
        </Container>
      </section>

      <CtaBand />
    </>
  );
}
