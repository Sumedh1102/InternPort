import Link from "next/link";

import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative grid size-9 shrink-0 place-items-center rounded-xl border-2 border-ink bg-lime shadow-brutal-xs",
        className,
      )}
    >
      <svg viewBox="0 0 32 32" className="size-6">
        <path
          d="M22.5 9.5c-1.4-2-3.8-3-6.6-3-4 0-6.6 2-6.6 5 0 7 13.8 3.6 13.8 10.4 0 3.2-2.9 5.6-7.2 5.6-3.2 0-5.9-1.3-7.4-3.6"
          fill="none"
          stroke="#0b0b0c"
          strokeWidth="3.4"
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute -right-1.5 -top-1.5 size-3 rotate-45 border-2 border-ink bg-pink" />
    </span>
  );
}

export function Logo({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <Link
      href="/"
      className={cn("group inline-flex items-center gap-2.5 rounded-xl", className)}
      aria-label="Sainam Technology — home"
    >
      <LogoMark className="transition-transform group-hover:-rotate-6" />
      <span className="flex flex-col leading-none">
        <span className={cn("font-display text-lg font-extrabold tracking-tight", inverted && "text-paper")}>
          SAINAM
        </span>
        <span
          className={cn(
            "font-mono text-[0.58rem] font-semibold uppercase tracking-[0.28em]",
            inverted ? "text-lime" : "text-muted",
          )}
        >
          Technology
        </span>
      </span>
    </Link>
  );
}
