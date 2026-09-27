import Link from "next/link";
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  Cloud,
  Code,
  FolderGit2,
  Globe,
  GraduationCap,
  Handshake,
  LayoutDashboard,
  MessageSquare,
  Plus,
  QrCode,
  Rocket,
  ShieldCheck,
  Smartphone,
  Sparkles,
  type LucideIcon as LucideIconType,
} from "lucide-react";

import { Burst, Sparkle, StickerLabel } from "@/components/brand/decor";
import { Reveal } from "@/components/brand/reveal";
import { buttonVariants } from "@/components/ui/button";
import { JOURNEY } from "@/lib/content";
import { cn } from "@/lib/utils";
import { Container } from "./section-heading";

const ICONS: Record<string, LucideIconType> = {
  Bot,
  BrainCircuit,
  Cloud,
  Code,
  FolderGit2,
  Globe,
  GraduationCap,
  Handshake,
  LayoutDashboard,
  MessageSquare,
  QrCode,
  Rocket,
  ShieldCheck,
  Smartphone,
};

export function LucideIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Sparkles;
  return <Icon className={className} aria-hidden />;
}

/** Accessible FAQ using native <details>/<summary>. */
export function FaqList({ items }: { items: readonly { question: string; answer: string }[] }) {
  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <details
          key={item.question}
          className="group rounded-2xl border-2 border-ink bg-paper shadow-brutal-xs open:shadow-brutal-sm"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold [&::-webkit-details-marker]:hidden">
            {item.question}
            <span className="grid size-8 shrink-0 place-items-center rounded-full border-2 border-ink bg-lime transition group-open:rotate-45">
              <Plus className="size-4" aria-hidden />
            </span>
          </summary>
          <p className="px-5 pb-5 text-ink-2">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}

/** Numbered journey used on the homepage and How it works. */
export function JourneySteps({ compact }: { compact?: boolean }) {
  const steps = compact ? JOURNEY.slice(0, 8) : JOURNEY;
  return (
    <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {steps.map((step, i) => (
        <Reveal as="li" key={step.title} delay={i * 60}>
          <div
            className={cn(
              "relative flex h-full flex-col gap-3 rounded-card border-2 border-ink p-5 shadow-brutal-sm",
              i === 6 ? "bg-lime" : i === 4 || i === 5 ? "bg-pink-soft" : "bg-paper",
            )}
          >
            <span className="font-mono text-xs font-bold text-muted">STEP {String(i + 1).padStart(2, "0")}</span>
            <h3 className="font-display text-xl font-extrabold leading-tight">{step.title}</h3>
            <p className="text-sm text-ink-2">{step.body}</p>
            {i < steps.length - 1 && (
              <ArrowRight className="absolute -right-3.5 top-1/2 z-10 hidden size-6 -translate-y-1/2 rounded-full border-2 border-ink bg-paper p-0.5 lg:block [li:nth-child(4n)_&]:hidden" aria-hidden />
            )}
          </div>
        </Reveal>
      ))}
    </ol>
  );
}

export function CtaBand({
  title = "Ready to build what's next?",
  body = "Applications for the Winter Internship 2026 are open. Early bird pricing is limited to the first 20 students.",
}: {
  title?: string;
  body?: string;
}) {
  return (
    <section className="py-16 sm:py-24">
      <Container>
        <div className="relative overflow-hidden rounded-chunk border-2 border-ink bg-ink px-6 py-12 text-paper shadow-brutal-lime sm:px-12 sm:py-16">
          <div aria-hidden className="bg-grid-dark absolute inset-0" />
          <Burst className="absolute -right-10 -top-10 size-44 animate-spin-slow text-lime opacity-90" aria-hidden />
          <Sparkle className="absolute bottom-6 right-1/3 size-10 text-pink" aria-hidden />
          <div className="relative flex max-w-2xl flex-col gap-5">
            <StickerLabel tone="lime">Winter Internship 2026</StickerLabel>
            <h2 className="font-display-wide text-4xl leading-[0.95] sm:text-6xl">{title}</h2>
            <p className="text-paper/80 sm:text-lg">{body}</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/apply" className={cn(buttonVariants({ size: "lg" }), "border-paper shadow-[4px_4px_0_0_var(--color-paper)]")}>
                Apply now <ArrowRight aria-hidden />
              </Link>
              <Link
                href="/internships"
                className={cn(buttonVariants({ size: "lg", variant: "outline" }), "border-paper bg-transparent text-paper shadow-[4px_4px_0_0_var(--color-paper)] hover:bg-paper/10 hover:shadow-[6px_6px_0_0_var(--color-paper)]")}
              >
                View programs
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output with "<" escaped cannot break out of the script tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
