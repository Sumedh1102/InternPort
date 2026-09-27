import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap } from "lucide-react";

import { Reveal } from "@/components/brand/reveal";
import { CtaBand, FaqList, JsonLd } from "@/components/site/blocks";
import { ProgramCard } from "@/components/site/cards";
import { Container, PageHero, SectionHeading } from "@/components/site/section-heading";
import { buttonVariants } from "@/components/ui/button";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { GENERAL_FAQ } from "@/lib/content";
import { SITE } from "@/lib/site";
import { getPublicPrograms } from "@/server/queries/programs";
import { getPublicSettings } from "@/server/queries/settings";

export const metadata: Metadata = {
  title: "Internships — Winter Internship 2026",
  description:
    "3-month internships in AI & Machine Learning, Generative AI, Full Stack, Frontend, Backend, Cloud and Software Development. Early bird ₹1,500/month/course for the first 20 students.",
  alternates: { canonical: "/internships" },
};

export const revalidate = 300;

export default async function InternshipsPage() {
  const [{ data: programs, error }, settings] = await Promise.all([getPublicPrograms(), getPublicSettings()]);
  return (
    <>
      {programs.length > 0 && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "ItemList",
            itemListElement: programs.map((p, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: `${SITE.url}/internships/${p.slug}`,
              name: p.name,
            })),
          }}
        />
      )}
      <PageHero
        kicker={SITE.program}
        title="Seven domains."
        highlight="Three months."
        description="Choose a program, apply in minutes, and build real projects with mentor feedback. Diploma, B.E., B.Tech, BCA and MCA students welcome."
      >
        <div className="flex flex-wrap gap-3">
          <Link href="/apply" className={buttonVariants({ size: "lg" })}>
            Apply now
          </Link>
          <Link href="/how-it-works" className={buttonVariants({ size: "lg", variant: "outline" })}>
            How it works
          </Link>
        </div>
      </PageHero>

      <section className="py-16 sm:py-24">
        <Container className="flex flex-col gap-8">
          {!settings.applicationsOpen && (
            <Alert tone="warning" title="Applications are currently closed">
              You can still explore the programs. Check back soon or contact us to be notified.
            </Alert>
          )}
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
              icon={<GraduationCap />}
              title={error === "unavailable" ? "Programs couldn't be loaded" : "Programs are being published"}
              description={
                error === "unavailable"
                  ? "Something went wrong on our side. Please refresh in a moment."
                  : "Our team is finalising this season's programs. Check back shortly."
              }
            />
          )}
        </Container>
      </section>

      <section className="border-t-2 border-ink bg-cream-2 py-16 sm:py-24">
        <Container className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <SectionHeading kicker="FAQ" title="Before you" highlight="apply." />
          <FaqList items={GENERAL_FAQ} />
        </Container>
      </section>
      <CtaBand />
    </>
  );
}
