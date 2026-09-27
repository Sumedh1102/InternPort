import Link from "next/link";
import { ArrowRight, Bot, Check } from "lucide-react";

import {
  ArrowCurve,
  BrowserFrame,
  Burst,
  CircleScribble,
  FloatingSticker,
  PixelCluster,
  Scribble,
  Sparkle,
  Star,
  StickerLabel,
} from "@/components/brand/decor";
import { buttonVariants } from "@/components/ui/button";
import { formatINR } from "@/lib/domain/pricing";
import { HERO_BADGES, SITE } from "@/lib/site";
import { cn } from "@/lib/utils";
import { TechBadge } from "./tech";

/** Where each floating badge sits around the central visual (desktop). */
const BADGE_SLOTS = [
  "left-[2%] top-[6%]",
  "right-[4%] top-[2%]",
  "left-[-4%] top-[38%]",
  "right-[-6%] top-[30%]",
  "left-[6%] bottom-[10%]",
  "right-[2%] bottom-[16%]",
  "left-[30%] top-[-5%]",
  "right-[26%] bottom-[-4%]",
] as const;

export function Hero({ earlyBirdFrom, programCount }: { earlyBirdFrom?: number | null; programCount: number }) {
  const floating = HERO_BADGES.slice(0, BADGE_SLOTS.length);
  return (
    <section className="relative overflow-hidden border-b-2 border-ink">
      <div aria-hidden className="bg-grid absolute inset-0" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-cream to-transparent" />

      <FloatingSticker className="left-[3%] top-24 hidden text-lime md:block" rotate={-12}>
        <Sparkle className="size-12" />
      </FloatingSticker>
      <FloatingSticker className="right-[46%] top-10 hidden text-pink lg:block" rotate={8} delay={1.2}>
        <Star className="size-8" />
      </FloatingSticker>
      <FloatingSticker className="bottom-16 left-[40%] hidden text-cyan lg:block" rotate={0} delay={0.6} slow>
        <Sparkle className="size-7" />
      </FloatingSticker>

      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[1.08fr_1fr] lg:gap-8 lg:px-8 lg:pb-24 lg:pt-20">
        {/* Copy */}
        <div className="relative z-10 flex flex-col items-start gap-7">
          <StickerLabel tone="ink" rotate={-3}>
            <span className="size-2 animate-pulse rounded-full bg-lime" aria-hidden />
            {SITE.program} · applications open
          </StickerLabel>

          <h1 className="font-display-wide text-[clamp(3.1rem,11vw,7.6rem)] uppercase leading-[0.86]">
            <span className="block">
              Learn{" "}
              <span className="relative inline-block">
                today.
                <Scribble className="absolute -bottom-3 left-0 hidden h-6 w-full text-pink sm:block" />
              </span>
            </span>
            <span className="mt-2 block">
              <span className="relative -ml-1 inline-block -rotate-2 rounded-2xl border-2 border-ink bg-lime px-3 pb-1 shadow-brutal">
                Build
              </span>
            </span>
            <span className="relative mt-2 block w-fit">
              tomorrow.
              <CircleScribble className="pointer-events-none absolute -inset-x-4 -inset-y-3 h-[calc(100%+1.5rem)] w-[calc(100%+2rem)] text-blue" />
            </span>
          </h1>

          <p className="max-w-xl text-lg text-ink-2 sm:text-xl">
            {SITE.programDuration} of mentor-led, project-first internships in AI, Generative AI, Full Stack,
            Cloud and Software Development — built by{" "}
            <strong className="font-semibold">{SITE.name}</strong>.
          </p>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link href="/apply" className={cn(buttonVariants({ size: "lg" }), "uppercase tracking-wide")}>
              Apply now <ArrowRight aria-hidden />
            </Link>
            <Link
              href="/internships"
              className={cn(buttonVariants({ size: "lg", variant: "outline" }), "uppercase tracking-wide")}
            >
              Explore internships
            </Link>
          </div>

          {earlyBirdFrom ? (
            <div className="flex items-center gap-3">
              <div className="relative grid size-20 shrink-0 place-items-center">
                <Burst className="absolute inset-0 size-full animate-spin-slow text-pink" />
                <span className="relative text-center font-mono text-[0.6rem] font-bold uppercase leading-tight">
                  Early
                  <br />
                  bird
                </span>
              </div>
              <p className="text-sm">
                <strong className="font-display text-xl font-extrabold">{formatINR(earlyBirdFrom)}</strong>
                <span className="text-muted"> / month / course</span>
                <br />
                <span className="font-semibold">First 20 students only</span>
                {programCount > 0 && <span className="text-muted"> · {programCount} programs</span>}
              </p>
            </div>
          ) : null}
        </div>

        {/* Visual */}
        <div className="relative mx-auto w-full max-w-[560px] lg:py-10">
          <div className="relative z-10 rotate-1">
            <BrowserFrame url="sainam.tech/learn/week-03">
              <div className="grid gap-0 sm:grid-cols-[1.25fr_1fr]">
                <div className="bg-ink p-4 font-mono text-[0.72rem] leading-6 text-paper sm:p-5 sm:text-xs">
                  <p>
                    <span className="text-pink">import</span> {"{ train }"} <span className="text-pink">from</span>{" "}
                    <span className="text-lime">&quot;./model&quot;</span>
                  </p>
                  <p className="text-paper/50">{"// week 3 · your first classifier"}</p>
                  <p>
                    <span className="text-cyan">const</span> model = <span className="text-lime">await</span> train({"{"}
                  </p>
                  <p className="pl-4">
                    data: <span className="text-lime">&quot;students.csv&quot;</span>,
                  </p>
                  <p className="pl-4">
                    epochs: <span className="text-amber">12</span>,
                  </p>
                  <p>{"});"}</p>
                  <p>
                    model.<span className="text-cyan">evaluate</span>()
                    <span className="ml-0.5 inline-block h-4 w-2 translate-y-0.5 animate-blink bg-lime" aria-hidden />
                  </p>
                </div>
                <div className="flex flex-col gap-3 bg-cream p-4 sm:p-5">
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <span className="grid size-7 place-items-center rounded-full border-2 border-ink bg-lime">
                      <Bot className="size-4" aria-hidden />
                    </span>
                    AI assistant
                  </div>
                  <p className="rounded-2xl rounded-tl-sm border-2 border-ink bg-paper p-3 text-xs leading-relaxed">
                    Hint: check how you split train and test data before you evaluate. Want me to explain why?
                  </p>
                  <ul className="mt-auto flex flex-col gap-1.5 text-xs">
                    {["Fundamentals", "Core technologies", "Project work"].map((s, i) => (
                      <li key={s} className="flex items-center gap-2">
                        <span
                          className={cn(
                            "grid size-5 place-items-center rounded-md border-2 border-ink",
                            i < 2 ? "bg-lime" : "bg-paper",
                          )}
                        >
                          {i < 2 && <Check className="size-3" aria-hidden />}
                        </span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </BrowserFrame>
          </div>

          <div aria-hidden className="absolute -right-3 -top-6 z-20 -rotate-6 sm:-right-6">
            <StickerLabel tone="pink" rotate={0}>
              AI-forward ✦
            </StickerLabel>
          </div>
          <div aria-hidden className="absolute -bottom-10 -left-2 z-20 hidden rotate-[-8deg] sm:block">
            <div className="flex items-end gap-1 font-mono text-xs font-semibold">
              <ArrowCurve className="h-10 w-14 -scale-y-100 rotate-180" />
              <span className="rounded-md bg-paper px-1.5 py-0.5">real projects, reviewed</span>
            </div>
          </div>
          <PixelCluster className="absolute -left-10 top-4 hidden w-10 text-ink lg:grid" />

          {/* Floating AI & tech badges (decorative) */}
          <div aria-hidden className="pointer-events-none absolute inset-[-12%] hidden lg:block">
            {floating.map((b, i) => (
              <div
                key={b.name}
                className={cn("absolute", BADGE_SLOTS[i])}
                style={{ rotate: `${(i % 2 === 0 ? -1 : 1) * (3 + (i % 3) * 2)}deg` }}
              >
                <div className="animate-float" style={{ animationDelay: `${i * 0.45}s` }}>
                  <TechBadge name={b.name} glyph={b.glyph} tone={b.tone} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Compact badge cloud for small screens */}
      <div className="relative mx-auto -mt-4 flex max-w-7xl flex-wrap justify-center gap-2 px-4 pb-10 lg:hidden" aria-hidden>
        {HERO_BADGES.slice(0, 10).map((b, i) => (
          <span key={b.name} style={{ rotate: `${(i % 2 === 0 ? -1 : 1) * 3}deg` }}>
            <TechBadge name={b.name} glyph={b.glyph} tone={b.tone} size="sm" />
          </span>
        ))}
      </div>
    </section>
  );
}
