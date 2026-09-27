import Link from "next/link";

import { Burst, Sparkle } from "@/components/brand/decor";
import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="main" className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-cream px-4 text-center">
      <div aria-hidden className="bg-grid absolute inset-0" />
      <Burst className="absolute -right-16 -top-16 size-64 animate-spin-slow text-lime" aria-hidden />
      <div className="relative flex flex-col items-center gap-6">
        <Logo />
        <p className="font-display-wide text-[clamp(6rem,22vw,14rem)] leading-none">
          4<span className="text-pink">0</span>4
        </p>
        <h1 className="font-display text-3xl font-extrabold">This page wandered off.</h1>
        <p className="max-w-md text-muted">The link may be broken or the page may have moved.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/" className={buttonVariants()}>
            Back home
          </Link>
          <Link href="/internships" className={buttonVariants({ variant: "outline" })}>
            Explore internships
          </Link>
        </div>
      </div>
      <Sparkle className="absolute bottom-16 left-10 size-12 text-cyan" />
    </main>
  );
}
