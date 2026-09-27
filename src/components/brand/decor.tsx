import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Neo-Y2K decorative vocabulary. All purely decorative → aria-hidden.
 * Colours inherit `currentColor` unless a fill is passed.
 */

type SvgProps = React.SVGProps<SVGSVGElement> & { className?: string };

export function Sparkle({ className, ...props }: SvgProps) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={className} {...props}>
      <path
        d="M24 2c1.6 10.4 5.6 16.4 22 22-16.4 5.6-20.4 11.6-22 22-1.6-10.4-5.6-16.4-22-22 16.4-5.6 20.4-11.6 22-22z"
        fill="currentColor"
        stroke="#0b0b0c"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Star({ className, ...props }: SvgProps) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={className} {...props}>
      <path
        d="M24 3l5.9 13.2L44 17.6 33.2 27.4 36.4 42 24 34.6 11.6 42l3.2-14.6L4 17.6l14.1-1.4z"
        fill="currentColor"
        stroke="#0b0b0c"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Burst({ className, children, ...props }: SvgProps & { children?: React.ReactNode }) {
  const points = Array.from({ length: 24 }, (_, i) => {
    const r = i % 2 === 0 ? 50 : 40;
    const a = (i / 24) * Math.PI * 2;
    return `${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a)).toFixed(2)}`;
  }).join(" ");
  return (
    <svg viewBox="-2 -2 104 104" aria-hidden className={className} {...props}>
      <polygon points={points} fill="currentColor" stroke="#0b0b0c" strokeWidth="2.5" strokeLinejoin="round" />
      {children}
    </svg>
  );
}

export function Squiggle({ className, ...props }: SvgProps) {
  return (
    <svg viewBox="0 0 200 24" fill="none" aria-hidden className={className} {...props}>
      <path
        d="M2 12c12-12 24-12 36 0s24 12 36 0 24-12 36 0 24 12 36 0 24-12 36 0 12 6 16 6"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Scribble({ className, ...props }: SvgProps) {
  return (
    <svg viewBox="0 0 120 60" fill="none" aria-hidden className={className} {...props}>
      <path
        d="M6 40c10-22 26-30 34-20s-14 26-2 28 22-34 36-32 -6 30 8 30 18-26 30-28"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ArrowCurve({ className, ...props }: SvgProps) {
  return (
    <svg viewBox="0 0 120 80" fill="none" aria-hidden className={className} {...props}>
      <path
        d="M6 10c30-4 64 6 78 26s8 30 2 34"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path d="M70 62l16 10 6-18" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Underline({ className, ...props }: SvgProps) {
  return (
    <svg viewBox="0 0 300 20" fill="none" preserveAspectRatio="none" aria-hidden className={className} {...props}>
      <path d="M3 14c60-8 140-11 294-6" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

export function CircleScribble({ className, ...props }: SvgProps) {
  return (
    <svg viewBox="0 0 300 120" fill="none" preserveAspectRatio="none" aria-hidden className={className} {...props}>
      <path
        d="M150 8C70 6 8 28 10 62s70 52 150 50 132-24 130-56S214 4 120 14"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PixelCluster({ className }: { className?: string }) {
  const cells = [1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 1];
  return (
    <div aria-hidden className={cn("grid grid-cols-4 gap-1", className)}>
      {cells.map((on, i) => (
        <span key={i} className={cn("aspect-square w-full", on ? "bg-current" : "bg-transparent")} />
      ))}
    </div>
  );
}

/** GridBackground — graph paper that fades out toward the edges. */
export function GridBackground({ className, dark }: { className?: string; dark?: boolean }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0",
        dark ? "bg-grid-dark" : "bg-grid",
        "[mask-image:radial-gradient(ellipse_at_center,black_45%,transparent_80%)]",
        className,
      )}
    />
  );
}

/** FloatingSticker — rotated, gently floating decorative element. */
export function FloatingSticker({
  children,
  className,
  rotate = 0,
  delay = 0,
  slow,
}: {
  children: React.ReactNode;
  className?: string;
  rotate?: number;
  delay?: number;
  slow?: boolean;
}) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute", className)} style={{ rotate: `${rotate}deg` }}>
      <div className={slow ? "animate-float-slow" : "animate-float"} style={{ animationDelay: `${delay}s` }}>
        {children}
      </div>
    </div>
  );
}

/** ArrowAnnotation — hand-drawn arrow with a mono "margin note". */
export function ArrowAnnotation({
  children,
  className,
  flip,
}: {
  children: React.ReactNode;
  className?: string;
  flip?: boolean;
}) {
  return (
    <div className={cn("flex items-end gap-1 font-mono text-xs font-semibold text-ink", flip && "flex-row-reverse", className)}>
      <span className="rounded-md bg-paper/80 px-1.5 py-0.5">{children}</span>
      <ArrowCurve className={cn("h-10 w-14 text-ink", flip && "-scale-x-100")} />
    </div>
  );
}

/** BrowserFrame — Y2K window chrome around any content. */
export function BrowserFrame({
  children,
  url = "sainam.tech",
  className,
  tone = "paper",
}: {
  children: React.ReactNode;
  url?: string;
  className?: string;
  tone?: "paper" | "ink";
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-chunk border-2 border-ink shadow-brutal-lg",
        tone === "ink" ? "bg-ink text-paper" : "bg-paper",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b-2 border-ink bg-cream-2 px-4 py-2.5 text-ink">
        <span className="size-3 rounded-full border-2 border-ink bg-pink" />
        <span className="size-3 rounded-full border-2 border-ink bg-amber" />
        <span className="size-3 rounded-full border-2 border-ink bg-lime" />
        <span className="ml-3 truncate rounded-full border-2 border-ink bg-paper px-3 py-0.5 font-mono text-[0.7rem]">
          {url}
        </span>
      </div>
      {children}
    </div>
  );
}

/** Sticker label — tilted pill used for callouts like "EARLY BIRD". */
export function StickerLabel({
  children,
  className,
  tone = "pink",
  rotate = -4,
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "pink" | "lime" | "cyan" | "ink" | "paper";
  rotate?: number;
}) {
  const tones = {
    pink: "bg-pink text-ink",
    lime: "bg-lime text-ink",
    cyan: "bg-cyan text-ink",
    ink: "bg-ink text-lime",
    paper: "bg-paper text-ink",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border-2 border-ink px-3 py-1 font-mono text-[0.7rem] font-bold uppercase tracking-wider shadow-brutal-xs",
        tones[tone],
        className,
      )}
      style={{ rotate: `${rotate}deg` }}
    >
      {children}
    </span>
  );
}
