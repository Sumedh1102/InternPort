import * as React from "react";

import { Sparkle } from "@/components/brand/decor";
import { cn } from "@/lib/utils";

type Tone = "paper" | "pink" | "cyan" | "ink" | "lime" | "blue";

const TONES: Record<Tone, string> = {
  paper: "bg-paper text-ink",
  pink: "bg-pink text-ink",
  cyan: "bg-cyan text-ink",
  ink: "bg-ink text-paper",
  lime: "bg-lime text-ink",
  blue: "bg-blue text-paper",
};

/** TechBadge — sticker-style pill for AI tools and technologies. */
export function TechBadge({
  name,
  glyph,
  tone = "paper",
  logoSrc,
  className,
  size = "md",
}: {
  name: string;
  glyph?: string;
  tone?: Tone;
  logoSrc?: string;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 whitespace-nowrap rounded-full border-2 border-ink font-semibold shadow-brutal-sm",
        size === "sm" ? "py-1 pl-1 pr-3 text-xs" : "py-1.5 pl-1.5 pr-4 text-sm",
        TONES[tone],
        className,
      )}
    >
      <span
        className={cn(
          "grid shrink-0 place-items-center rounded-full border-2 border-ink bg-paper font-mono font-bold text-ink",
          size === "sm" ? "size-6 text-[0.65rem]" : "size-7 text-xs",
        )}
        aria-hidden
      >
        {logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoSrc} alt="" className="size-4 object-contain" />
        ) : (
          glyph ?? name.slice(0, 1)
        )}
      </span>
      {name}
    </span>
  );
}

/** TechMarquee — infinite strip; pauses on hover; static wrap under reduced motion. */
export function TechMarquee({
  items,
  tone = "ink",
  reverse,
  className,
}: {
  items: readonly string[];
  tone?: "ink" | "lime";
  reverse?: boolean;
  className?: string;
}) {
  const row = (hidden: boolean) =>
    items.map((item, i) => (
      <span
        key={`${hidden}-${i}`}
        aria-hidden={hidden || undefined}
        className="flex shrink-0 items-center gap-6 px-3 font-display text-2xl font-extrabold uppercase tracking-tight sm:text-4xl"
      >
        {item}
        <Sparkle className={cn("size-6 sm:size-8", tone === "ink" ? "text-lime" : "text-pink")} />
      </span>
    ));
  return (
    <div
      className={cn(
        "marquee relative overflow-hidden border-y-2 border-ink py-4",
        tone === "ink" ? "bg-ink text-paper" : "bg-lime text-ink",
        className,
      )}
      role="region"
      aria-label="Technologies we work with"
    >
      <div className="marquee-track" data-reverse={reverse ? "true" : undefined}>
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
