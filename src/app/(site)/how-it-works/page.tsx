import type { Metadata } from "next";
import { Banknote, CircleCheck, ClipboardCheck, ShieldCheck } from "lucide-react";

import { StickerLabel } from "@/components/brand/decor";
import { CtaBand, FaqList, JourneySteps, JsonLd } from "@/components/site/blocks";
import { Container, PageHero, SectionHeading } from "@/components/site/section-heading";
import { GENERAL_FAQ } from "@/lib/content";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "How the Sainam Technology Winter Internship 2026 works: application, admin review, manual payment verification, enrollment and certification.",
  alternates: { canonical: "/how-it-works" },
};

const PAYMENT_STEPS = [
  { icon: ClipboardCheck, title: "Approved", body: "Your application is approved and an enrollment is created for you." },
  { icon: Banknote, title: "Pay offline", body: "Follow the payment instructions on your dashboard (shared by Sainam Technology)." },
  { icon: ShieldCheck, title: "Submit reference", body: "Enter the transaction/UTR reference. Never enter card numbers or passwords." },
  { icon: CircleCheck, title: "Verified & activated", body: "Our team verifies it manually and activates your enrollment." },
];

export default function HowItWorksPage() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: GENERAL_FAQ.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: { "@type": "Answer", text: f.answer },
          })),
        }}
      />
      <PageHero
        kicker="How it works"
        title="Eight steps from"
        highlight="curious to certified."
        description="A transparent process with a human review at every important step."
      />
      <section className="py-16 sm:py-24">
        <Container>
          <JourneySteps />
        </Container>
      </section>

      <section className="border-y-2 border-ink bg-cream-2 py-16 sm:py-24">
        <Container className="grid gap-12 lg:grid-cols-[1fr_1.2fr]">
          <div className="flex flex-col gap-5">
            <SectionHeading kicker="Payments" title="No checkout." highlight="Just people." />
            <p className="text-ink-2">
              There is no online payment gateway. Once you&apos;re approved, you pay using the instructions shared with
              you, then submit your reference. A Sainam team member verifies it and activates your enrollment — you can
              follow every status change on your dashboard.
            </p>
            <div className="flex flex-wrap gap-2">
              {["Payment pending", "Payment in review", "Payment confirmed"].map((s, i) => (
                <StickerLabel key={s} tone={i === 2 ? "lime" : i === 1 ? "cyan" : "paper"} rotate={i - 1}>
                  {s}
                </StickerLabel>
              ))}
            </div>
          </div>
          <ol className="grid gap-4 sm:grid-cols-2">
            {PAYMENT_STEPS.map((s, i) => (
              <li key={s.title} className="rounded-card border-2 border-ink bg-paper p-5 shadow-brutal-sm">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl border-2 border-ink bg-lime">
                    <s.icon className="size-5" aria-hidden />
                  </span>
                  <span className="font-mono text-xs font-bold text-muted">0{i + 1}</span>
                </div>
                <h3 className="mt-3 font-display text-xl font-extrabold">{s.title}</h3>
                <p className="mt-1 text-sm text-ink-2">{s.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section className="py-16 sm:py-24">
        <Container className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <SectionHeading kicker="FAQ" title="Questions," highlight="answered." />
          <FaqList items={GENERAL_FAQ} />
        </Container>
      </section>
      <CtaBand />
    </>
  );
}
