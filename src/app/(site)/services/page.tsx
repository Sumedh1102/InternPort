import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { Reveal } from "@/components/brand/reveal";
import { CtaBand, JsonLd, LucideIcon } from "@/components/site/blocks";
import { Container, PageHero } from "@/components/site/section-heading";
import { buttonVariants } from "@/components/ui/button";
import { SERVICES } from "@/lib/content";
import { SITE } from "@/lib/site";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Software development, AI/ML, web development, mobile applications, cloud solutions, IT consulting, technology training and internship programs.",
  alternates: { canonical: "/services" },
};

const TONES = ["bg-lime", "bg-paper", "bg-paper", "bg-cyan-soft", "bg-paper", "bg-pink-soft", "bg-paper", "bg-lime"];

export default function ServicesPage() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: SITE.name,
          url: SITE.url,
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: "Services",
            itemListElement: SERVICES.map((s) => ({
              "@type": "Offer",
              itemOffered: { "@type": "Service", name: s.title, description: s.blurb },
            })),
          },
        }}
      />
      <PageHero
        kicker="Services"
        title="From idea to"
        highlight="shipped."
        description="Eight practice areas that share one approach: understand the problem, build it properly, and hand over something your team can maintain."
      />
      <section className="py-16 sm:py-24">
        <Container>
          <ul className="grid gap-6 md:grid-cols-2">
            {SERVICES.map((s, i) => (
              <Reveal as="li" key={s.key} delay={(i % 2) * 80}>
                <article
                  id={s.key}
                  className={cn(
                    "flex h-full scroll-mt-24 flex-col gap-4 rounded-card border-2 border-ink p-6 shadow-brutal sm:p-8",
                    TONES[i],
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="grid size-14 place-items-center rounded-2xl border-2 border-ink bg-paper">
                      <LucideIcon name={s.icon} className="size-6" />
                    </span>
                    <span className="font-mono text-sm font-bold">{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <h2 className="font-display text-3xl font-extrabold">{s.title}</h2>
                  <p className="text-ink-2">{s.blurb}</p>
                  <ul className="mt-auto flex flex-col gap-2 border-t-2 border-dashed border-ink/30 pt-4 text-sm">
                    {s.points.map((p) => (
                      <li key={p} className="flex items-center gap-2">
                        <Check className="size-4 shrink-0" aria-hidden /> {p}
                      </li>
                    ))}
                  </ul>
                </article>
              </Reveal>
            ))}
          </ul>
          <div className="mt-12 flex flex-col items-start justify-between gap-4 rounded-card border-2 border-ink bg-ink p-6 text-paper sm:flex-row sm:items-center sm:p-8">
            <p className="font-display text-2xl font-extrabold">Have a project in mind?</p>
            <Link href="/contact" className={buttonVariants()}>
              Talk to us <ArrowRight aria-hidden />
            </Link>
          </div>
        </Container>
      </section>
      <CtaBand />
    </>
  );
}
