import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Award, CalendarDays, Check, GraduationCap, MonitorSmartphone, Wallet } from "lucide-react";

import { Sparkle, StickerLabel, Underline } from "@/components/brand/decor";
import { CtaBand, FaqList, JsonLd } from "@/components/site/blocks";
import { Container, SectionHeading } from "@/components/site/section-heading";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { formatINR, totalFee } from "@/lib/domain/pricing";
import { SITE } from "@/lib/site";
import { cn } from "@/lib/utils";
import { getPublicProgramBySlug, getPublicPrograms } from "@/server/queries/programs";
import { getPublicSettings } from "@/server/queries/settings";

export const revalidate = 300;

export async function generateStaticParams() {
  const { data } = await getPublicPrograms();
  return data.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/internships/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const program = await getPublicProgramBySlug(slug);
  if (!program) return { title: "Program not found" };
  const title = `${program.name} Internship`;
  return {
    title,
    description: `${program.tagline} ${program.durationLabel} · Early bird ${formatINR(program.fees.earlyBird)}/month.`,
    alternates: { canonical: `/internships/${program.slug}` },
    openGraph: { title: `${title} · ${SITE.name}`, description: program.description },
  };
}

const ACCENT = { lime: "bg-lime", pink: "bg-pink", cyan: "bg-cyan", blue: "bg-blue text-paper" } as const;

export default async function ProgramPage({ params }: PageProps<"/internships/[slug]">) {
  const { slug } = await params;
  const [program, settings] = await Promise.all([getPublicProgramBySlug(slug), getPublicSettings()]);
  if (!program) notFound();

  const canApply = program.status === "PUBLISHED" && settings.applicationsOpen;
  const applyHref = `/apply?program=${program.slug}`;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Course",
          name: `${program.name} Internship`,
          description: program.description,
          provider: { "@type": "Organization", name: SITE.name, sameAs: SITE.url },
          timeRequired: `P${program.durationMonths}M`,
          offers: {
            "@type": "Offer",
            category: "Paid",
            price: program.fees.regular,
            priceCurrency: "INR",
          },
          hasCourseInstance: { "@type": "CourseInstance", courseMode: "blended", courseWorkload: program.durationLabel },
        }}
      />

      {/* Header */}
      <section className="relative overflow-hidden border-b-2 border-ink">
        <div aria-hidden className="bg-grid absolute inset-0" />
        <Container className="relative grid gap-10 py-12 sm:py-16 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div className="flex flex-col items-start gap-5">
            <Link href="/internships" className="inline-flex items-center gap-1.5 text-sm font-semibold hover:underline">
              <ArrowLeft className="size-4" aria-hidden /> All internships
            </Link>
            <StickerLabel tone="ink">{SITE.program}</StickerLabel>
            <h1 className="font-display-wide text-5xl leading-[0.92] sm:text-7xl">
              <span className="relative inline-block">
                {program.name}
                <Underline className="absolute -bottom-2 left-0 h-5 w-full text-lime" />
              </span>
            </h1>
            <p className="max-w-2xl text-lg text-ink-2">{program.tagline}</p>
            <div className="flex flex-wrap gap-2">
              <Badge tone="paper">
                <CalendarDays aria-hidden /> {program.durationLabel}
              </Badge>
              <Badge tone="paper">
                <MonitorSmartphone aria-hidden /> {program.mode}
              </Badge>
              <Badge tone="paper">
                <Award aria-hidden /> Verifiable certificate
              </Badge>
              {program.status === "PAUSED" && <Badge tone="amber">Applications paused</Badge>}
            </div>
          </div>

          {/* Fee card */}
          <aside
            className={cn("relative rounded-chunk border-2 border-ink p-6 shadow-brutal-lg", ACCENT[program.accent] ?? "bg-lime")}
            aria-label="Fees"
          >
            <Sparkle className="absolute -right-4 -top-4 size-10 text-paper" />
            <p className="font-mono text-xs font-bold uppercase tracking-wider">Early bird · first 20 students</p>
            <p className="mt-2 font-display text-5xl font-extrabold">{formatINR(program.fees.earlyBird)}</p>
            <p className="text-sm font-semibold">/ month / course</p>
            <div className="my-4 border-t-2 border-dashed border-current opacity-40" />
            <p className="font-mono text-xs font-bold uppercase tracking-wider">Regular</p>
            <p className="font-display text-2xl font-extrabold">
              {formatINR(program.fees.regular)} <span className="text-sm font-semibold">/ month / course</span>
            </p>
            <p className="mt-2 text-xs">
              {program.durationMonths}-month total: {formatINR(totalFee(program.fees, "EARLY_BIRD", program.durationMonths))}{" "}
              (early bird) · {formatINR(totalFee(program.fees, "REGULAR", program.durationMonths))} (regular)
            </p>
            <div className="mt-5 flex flex-col gap-2">
              {canApply ? (
                <Link href={applyHref} className={cn(buttonVariants({ variant: "dark", size: "lg" }), "w-full")}>
                  Apply for this program <ArrowRight aria-hidden />
                </Link>
              ) : (
                <span className={cn(buttonVariants({ variant: "outline", size: "lg" }), "pointer-events-none w-full opacity-70")}>
                  Applications closed
                </span>
              )}
              <p className="flex items-center gap-1.5 text-xs">
                <Wallet className="size-3.5" aria-hidden /> No online checkout — payment is verified manually after approval.
              </p>
            </div>
          </aside>
        </Container>
      </section>

      {/* Description + eligibility */}
      <section className="py-16 sm:py-20">
        <Container className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div className="flex flex-col gap-4">
            <SectionHeading kicker="Overview" title="About the" highlight="program." />
            <p className="whitespace-pre-line text-lg text-ink-2">{program.description}</p>
            {program.skills.length > 0 && (
              <div className="mt-4">
                <h3 className="mb-3 font-display text-xl font-extrabold">Skills you&apos;ll build</h3>
                <ul className="flex flex-wrap gap-2">
                  {program.skills.map((s) => (
                    <li key={s}>
                      <Badge tone="lime">{s}</Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="rounded-card border-2 border-ink bg-paper p-6 shadow-brutal">
            <h2 className="flex items-center gap-2 font-display text-2xl font-extrabold">
              <GraduationCap className="size-6" aria-hidden /> Eligibility
            </h2>
            <ul className="mt-4 flex flex-col gap-3">
              {program.eligibility.map((e) => (
                <li key={e} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0" aria-hidden /> {e}
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      {/* Curriculum */}
      {program.curriculum.length > 0 && (
        <section className="border-y-2 border-ink bg-cream-2 py-16 sm:py-20">
          <Container>
            <SectionHeading kicker="Curriculum" title="What you'll" highlight="learn." />
            <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {program.curriculum.map((m, i) => (
                <li key={m.title} className="rounded-card border-2 border-ink bg-paper p-5 shadow-brutal-sm">
                  <span className="font-mono text-xs font-bold text-muted">MODULE {String(i + 1).padStart(2, "0")}</span>
                  <h3 className="mt-1 font-display text-xl font-extrabold">{m.title}</h3>
                  <ul className="mt-3 flex flex-col gap-1.5 text-sm text-ink-2">
                    {m.topics.map((t) => (
                      <li key={t} className="flex items-start gap-2">
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-ink" aria-hidden /> {t}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </Container>
        </section>
      )}

      {/* Roadmap */}
      {program.roadmap.length > 0 && (
        <section className="py-16 sm:py-20">
          <Container>
            <SectionHeading kicker="Weekly roadmap" title="Your" highlight="3 months." />
            <ol className="relative mt-10 flex flex-col gap-4 border-l-2 border-dashed border-ink pl-6 sm:pl-8">
              {program.roadmap.map((r, i) => (
                <li key={`${r.week}-${i}`} className="relative">
                  <span
                    className={cn(
                      "absolute -left-[2.1rem] top-4 size-5 rounded-full border-2 border-ink sm:-left-[2.6rem]",
                      i === program.roadmap.length - 1 ? "bg-pink" : "bg-lime",
                    )}
                    aria-hidden
                  />
                  <div className="flex flex-col gap-1 rounded-card border-2 border-ink bg-paper p-5 shadow-brutal-xs sm:flex-row sm:items-center sm:gap-6">
                    <span className="shrink-0 font-mono text-sm font-bold sm:w-28">{r.week}</span>
                    <div>
                      <h3 className="font-display text-xl font-extrabold">{r.title}</h3>
                      {r.description && <p className="text-sm text-ink-2">{r.description}</p>}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </Container>
        </section>
      )}

      {/* Technologies + benefits */}
      <section className="border-y-2 border-ink bg-ink py-16 text-paper sm:py-20">
        <Container className="grid gap-12 lg:grid-cols-2">
          <div>
            <StickerLabel tone="lime">Technologies</StickerLabel>
            <ul className="mt-6 flex flex-wrap gap-2">
              {program.technologies.map((t) => (
                <li key={t} className="rounded-full border-2 border-paper px-4 py-1.5 font-mono text-sm">
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <StickerLabel tone="pink">What you receive</StickerLabel>
            <ul className="mt-6 flex flex-col gap-3">
              {program.benefits.map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-lime text-ink">
                    <Check className="size-3.5" aria-hidden />
                  </span>
                  {b}
                </li>
              ))}
            </ul>
            {program.certificateInfo && (
              <p className="mt-6 rounded-2xl border-2 border-paper/40 p-4 text-sm text-paper/80">
                <Award className="mb-1 size-5 text-lime" aria-hidden />
                {program.certificateInfo}
              </p>
            )}
          </div>
        </Container>
      </section>

      {/* FAQ */}
      {program.faqs.length > 0 && (
        <section className="py-16 sm:py-20">
          <Container className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
            <SectionHeading kicker="FAQ" title="Good" highlight="questions." />
            <FaqList items={program.faqs} />
          </Container>
        </section>
      )}

      {!canApply && (
        <Container className="pb-8">
          <Alert tone="warning" title="Applications are not open for this program right now">
            Explore other programs or contact us to be notified when applications reopen.
          </Alert>
        </Container>
      )}
      <CtaBand title={`Build with ${program.name}.`} />
    </>
  );
}
