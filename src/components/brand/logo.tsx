import Link from "next/link";

import { BRAND_COLORS, LOGO_LOCKUP, LOGO_MARK_PATH, LOGO_WORDMARK_PATH } from "@/lib/brand";
import { cn } from "@/lib/utils";

/** The full logo (mark + wordmark). `inverted` switches the wordmark to paper for dark panels. */
export function LogoLockup({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <svg
      viewBox={`0 0 ${LOGO_LOCKUP.width} ${LOGO_LOCKUP.height}`}
      aria-hidden
      className={cn("h-full w-auto shrink-0 overflow-visible", inverted ? "text-paper" : "text-brand-slate", className)}
    >
      <path
        d={LOGO_MARK_PATH}
        fill={BRAND_COLORS.teal}
        className="origin-center transition-transform [transform-box:fill-box] group-hover:-rotate-6"
      />
      <path d={LOGO_WORDMARK_PATH} fill="currentColor" />
    </svg>
  );
}

/** Home link with the logo. Size it with a height class, e.g. `className="h-12"`. */
export function Logo({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <Link
      href="/"
      className={cn("group inline-flex h-10 w-fit shrink-0 items-center rounded-xl", className)}
      aria-label="Sainam Technology — home"
    >
      <LogoLockup inverted={inverted} />
    </Link>
  );
}
